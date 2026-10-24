"""Purchase and restock behaviour, including concurrency safety."""

from concurrent.futures import ThreadPoolExecutor

import pytest
from sqlalchemy import text

from tests.conftest import create_vehicle


class TestPurchase:
    def test_purchase_returns_the_updated_inventory_state(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=5)

        response = client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["id"] == created["id"]
        assert body["quantity"] == 4

    def test_purchase_decreases_stock_by_exactly_one(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=3)

        client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)

        current = client.get(f"/api/vehicles/{created['id']}", headers=user_headers).json()
        assert current["quantity"] == 2

    def test_repeated_purchases_each_remove_one_unit(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=3)

        for expected_remaining in (2, 1, 0):
            response = client.post(
                f"/api/vehicles/{created['id']}/purchase", headers=user_headers
            )
            assert response.status_code == 200
            assert response.json()["quantity"] == expected_remaining

    def test_purchase_persists_the_change(self, client, admin_headers, user_headers, db_session):
        created = create_vehicle(client, admin_headers, quantity=2)

        client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)

        stored = db_session.execute(
            text("SELECT quantity FROM vehicles WHERE id = :id"), {"id": created["id"]}
        ).scalar_one()
        assert stored == 1

    def test_purchase_is_rejected_when_stock_is_zero(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=0)

        response = client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)

        assert response.status_code == 409
        assert "stock" in response.json()["detail"].lower()

    def test_purchase_does_not_drive_stock_negative(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=1)

        client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)
        client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)

        current = client.get(f"/api/vehicles/{created['id']}", headers=user_headers).json()
        assert current["quantity"] == 0

    def test_purchase_of_an_unknown_vehicle_returns_404(self, client, user_headers):
        response = client.post("/api/vehicles/999999/purchase", headers=user_headers)

        assert response.status_code == 404


class TestRestock:
    def test_restock_adds_to_existing_stock(self, client, admin_headers):
        created = create_vehicle(client, admin_headers, quantity=2)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 5}, headers=admin_headers
        )

        assert response.status_code == 200, response.text
        assert response.json()["quantity"] == 7

    def test_restock_persists_the_change(self, client, admin_headers, db_session):
        created = create_vehicle(client, admin_headers, quantity=1)

        client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 3}, headers=admin_headers
        )

        stored = db_session.execute(
            text("SELECT quantity FROM vehicles WHERE id = :id"), {"id": created["id"]}
        ).scalar_one()
        assert stored == 4

    def test_restocking_an_empty_vehicle_makes_it_purchasable_again(
        self, client, admin_headers, user_headers
    ):
        created = create_vehicle(client, admin_headers, quantity=0)
        assert (
            client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers).status_code
            == 409
        )

        client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 2}, headers=admin_headers
        )

        response = client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)
        assert response.status_code == 200
        assert response.json()["quantity"] == 1

    def test_restock_rejects_zero_quantity(self, client, admin_headers):
        created = create_vehicle(client, admin_headers, quantity=2)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 0}, headers=admin_headers
        )

        assert response.status_code == 422

    def test_restock_rejects_negative_quantity(self, client, admin_headers):
        created = create_vehicle(client, admin_headers, quantity=2)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": -5}, headers=admin_headers
        )

        assert response.status_code == 422

    def test_restock_rejects_a_non_integer_quantity(self, client, admin_headers):
        created = create_vehicle(client, admin_headers, quantity=2)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock",
            json={"quantity": "lots"},
            headers=admin_headers,
        )

        assert response.status_code == 422

    def test_restock_rejects_a_missing_quantity(self, client, admin_headers):
        created = create_vehicle(client, admin_headers, quantity=2)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock", json={}, headers=admin_headers
        )

        assert response.status_code == 422

    def test_invalid_restock_leaves_stock_untouched(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=4)

        client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": -1}, headers=admin_headers
        )

        current = client.get(f"/api/vehicles/{created['id']}", headers=user_headers).json()
        assert current["quantity"] == 4

    def test_restock_of_an_unknown_vehicle_returns_404(self, client, admin_headers):
        response = client.post(
            "/api/vehicles/999999/restock", json={"quantity": 5}, headers=admin_headers
        )

        assert response.status_code == 404


class TestConcurrentPurchases:
    """The last unit must be sold exactly once, even under real contention."""

    @pytest.mark.slow
    def test_only_one_of_eight_concurrent_purchases_of_the_last_unit_succeeds(
        self, client, admin_headers, user_headers
    ):
        created = create_vehicle(client, admin_headers, quantity=1)
        url = f"/api/vehicles/{created['id']}/purchase"

        def purchase() -> int:
            return client.post(url, headers=user_headers).status_code

        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses = list(pool.map(lambda _: purchase(), range(8)))

        assert statuses.count(200) == 1, statuses
        assert statuses.count(409) == 7, statuses

        current = client.get(f"/api/vehicles/{created['id']}", headers=user_headers).json()
        assert current["quantity"] == 0

    @pytest.mark.slow
    def test_concurrent_purchases_never_oversell_limited_stock(
        self, client, admin_headers, user_headers
    ):
        created = create_vehicle(client, admin_headers, quantity=3)
        url = f"/api/vehicles/{created['id']}/purchase"

        def purchase() -> int:
            return client.post(url, headers=user_headers).status_code

        with ThreadPoolExecutor(max_workers=10) as pool:
            statuses = list(pool.map(lambda _: purchase(), range(10)))

        assert statuses.count(200) == 3, statuses
        assert statuses.count(409) == 7, statuses

        current = client.get(f"/api/vehicles/{created['id']}", headers=user_headers).json()
        assert current["quantity"] == 0
