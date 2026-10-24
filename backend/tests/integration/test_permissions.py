"""Authentication and role requirements for every vehicle endpoint.

Documented interpretation: the kata lists POST /api/vehicles and
PUT /api/vehicles/{id} as "protected" without naming a role. This project
restricts both to administrators, because changing the catalogue is an
inventory-management action. Every endpoint still rejects anonymous callers
with 401, which is the behaviour the kata requires.
"""

from tests.conftest import VEHICLE_PAYLOAD, create_vehicle


class TestAnonymousAccessIsRejected:
    def test_list_requires_authentication(self, client):
        assert client.get("/api/vehicles").status_code == 401

    def test_search_requires_authentication(self, client):
        assert client.get("/api/vehicles/search?make=Toyota").status_code == 401

    def test_get_one_requires_authentication(self, client):
        assert client.get("/api/vehicles/1").status_code == 401

    def test_create_requires_authentication(self, client):
        assert client.post("/api/vehicles", json=VEHICLE_PAYLOAD).status_code == 401

    def test_update_requires_authentication(self, client):
        assert client.put("/api/vehicles/1", json={"price": "100.00"}).status_code == 401

    def test_delete_requires_authentication(self, client):
        assert client.delete("/api/vehicles/1").status_code == 401

    def test_purchase_requires_authentication(self, client):
        assert client.post("/api/vehicles/1/purchase").status_code == 401

    def test_restock_requires_authentication(self, client):
        assert client.post("/api/vehicles/1/restock", json={"quantity": 5}).status_code == 401


class TestRegularUserPermissions:
    def test_can_list_inventory(self, client, user_headers):
        assert client.get("/api/vehicles", headers=user_headers).status_code == 200

    def test_can_search_inventory(self, client, user_headers):
        response = client.get("/api/vehicles/search?make=Toyota", headers=user_headers)
        assert response.status_code == 200

    def test_can_purchase(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=2)

        response = client.post(f"/api/vehicles/{created['id']}/purchase", headers=user_headers)

        assert response.status_code == 200, response.text

    def test_cannot_create_a_vehicle(self, client, user_headers):
        response = client.post("/api/vehicles", json=VEHICLE_PAYLOAD, headers=user_headers)

        assert response.status_code == 403

    def test_cannot_update_a_vehicle(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers)

        response = client.put(
            f"/api/vehicles/{created['id']}", json={"price": "100.00"}, headers=user_headers
        )

        assert response.status_code == 403

    def test_cannot_delete_a_vehicle(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers)

        response = client.delete(f"/api/vehicles/{created['id']}", headers=user_headers)

        assert response.status_code == 403

    def test_cannot_restock_a_vehicle(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 5}, headers=user_headers
        )

        assert response.status_code == 403

    def test_forbidden_restock_does_not_change_stock(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers, quantity=3)

        client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 5}, headers=user_headers
        )

        after = client.get(f"/api/vehicles/{created['id']}", headers=user_headers).json()
        assert after["quantity"] == 3


class TestAdminPermissions:
    def test_can_create_a_vehicle(self, client, admin_headers):
        response = client.post("/api/vehicles", json=VEHICLE_PAYLOAD, headers=admin_headers)

        assert response.status_code == 201

    def test_can_update_a_vehicle(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.put(
            f"/api/vehicles/{created['id']}", json={"price": "100.00"}, headers=admin_headers
        )

        assert response.status_code == 200

    def test_can_delete_a_vehicle(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.delete(f"/api/vehicles/{created['id']}", headers=admin_headers)

        assert response.status_code == 204

    def test_can_restock_a_vehicle(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.post(
            f"/api/vehicles/{created['id']}/restock", json={"quantity": 5}, headers=admin_headers
        )

        assert response.status_code == 200

    def test_can_purchase_like_any_user(self, client, admin_headers):
        created = create_vehicle(client, admin_headers, quantity=1)

        response = client.post(f"/api/vehicles/{created['id']}/purchase", headers=admin_headers)

        assert response.status_code == 200

    def test_admin_role_is_reported_by_me(self, client, admin_headers):
        response = client.get("/api/auth/me", headers=admin_headers)

        assert response.status_code == 200
        assert response.json()["role"] == "admin"
