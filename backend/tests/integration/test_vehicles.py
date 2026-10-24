"""Vehicle creation, listing, retrieval, search, update and deletion."""

from decimal import Decimal

from tests.conftest import VEHICLE_PAYLOAD, create_vehicle


class TestCreateVehicle:
    def test_creates_a_vehicle(self, client, admin_headers):
        response = client.post("/api/vehicles", json=VEHICLE_PAYLOAD, headers=admin_headers)

        assert response.status_code == 201, response.text
        body = response.json()
        assert body["make"] == "Toyota"
        assert body["model"] == "Camry"
        assert body["category"] == "Sedan"
        assert Decimal(str(body["price"])) == Decimal("25000.00")
        assert body["quantity"] == 10
        assert isinstance(body["id"], int)
        assert body["created_at"]
        assert body["updated_at"]

    def test_accepts_optional_fields(self, client, admin_headers):
        body = create_vehicle(
            client,
            admin_headers,
            year=2024,
            description="Demo vehicle",
            image_url="https://example.com/car.jpg",
        )

        assert body["year"] == 2024
        assert body["description"] == "Demo vehicle"
        assert body["image_url"] == "https://example.com/car.jpg"

    def test_preserves_monetary_precision(self, client, admin_headers):
        body = create_vehicle(client, admin_headers, price="19999.99")

        assert Decimal(str(body["price"])) == Decimal("19999.99")

    def test_trims_surrounding_whitespace(self, client, admin_headers):
        body = create_vehicle(client, admin_headers, make="  Honda  ")

        assert body["make"] == "Honda"

    def test_rejects_missing_required_fields(self, client, admin_headers):
        response = client.post(
            "/api/vehicles", json={"make": "Toyota"}, headers=admin_headers
        )

        assert response.status_code == 422

    def test_rejects_negative_price(self, client, admin_headers):
        payload = {**VEHICLE_PAYLOAD, "price": "-100.00"}

        response = client.post("/api/vehicles", json=payload, headers=admin_headers)

        assert response.status_code == 422

    def test_rejects_zero_price(self, client, admin_headers):
        payload = {**VEHICLE_PAYLOAD, "price": "0.00"}

        response = client.post("/api/vehicles", json=payload, headers=admin_headers)

        assert response.status_code == 422

    def test_rejects_negative_quantity(self, client, admin_headers):
        payload = {**VEHICLE_PAYLOAD, "quantity": -1}

        response = client.post("/api/vehicles", json=payload, headers=admin_headers)

        assert response.status_code == 422

    def test_rejects_blank_make(self, client, admin_headers):
        payload = {**VEHICLE_PAYLOAD, "make": "   "}

        response = client.post("/api/vehicles", json=payload, headers=admin_headers)

        assert response.status_code == 422

    def test_rejects_blank_category(self, client, admin_headers):
        payload = {**VEHICLE_PAYLOAD, "category": ""}

        response = client.post("/api/vehicles", json=payload, headers=admin_headers)

        assert response.status_code == 422

    def test_rejects_non_numeric_price(self, client, admin_headers):
        payload = {**VEHICLE_PAYLOAD, "price": "expensive"}

        response = client.post("/api/vehicles", json=payload, headers=admin_headers)

        assert response.status_code == 422


class TestListVehicles:
    def test_returns_an_empty_list_when_there_is_no_inventory(self, client, user_headers):
        response = client.get("/api/vehicles", headers=user_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_every_vehicle_with_all_fields(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, make="Toyota")
        create_vehicle(client, admin_headers, make="Honda", model="Civic")

        response = client.get("/api/vehicles", headers=user_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 2
        expected_fields = {
            "id",
            "make",
            "model",
            "category",
            "price",
            "quantity",
            "year",
            "description",
            "image_url",
            "created_at",
            "updated_at",
        }
        assert expected_fields <= set(body[0])

    def test_supports_optional_pagination(self, client, admin_headers, user_headers):
        for index in range(5):
            create_vehicle(client, admin_headers, model=f"Model{index}")

        page = client.get("/api/vehicles?limit=2&offset=0", headers=user_headers).json()
        next_page = client.get("/api/vehicles?limit=2&offset=2", headers=user_headers).json()

        assert len(page) == 2
        assert len(next_page) == 2
        assert {v["id"] for v in page}.isdisjoint({v["id"] for v in next_page})


class TestGetVehicle:
    def test_returns_a_single_vehicle(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers)

        response = client.get(f"/api/vehicles/{created['id']}", headers=user_headers)

        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_returns_404_for_an_unknown_vehicle(self, client, user_headers):
        response = client.get("/api/vehicles/999999", headers=user_headers)

        assert response.status_code == 404


class TestSearchVehicles:
    def test_search_path_is_not_treated_as_a_vehicle_id(self, client, user_headers):
        response = client.get("/api/vehicles/search", headers=user_headers)

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_searches_by_make_case_insensitively(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, make="Toyota")
        create_vehicle(client, admin_headers, make="Honda", model="Civic")

        response = client.get("/api/vehicles/search?make=toyota", headers=user_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["make"] == "Toyota"

    def test_searches_by_partial_make(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, make="Mercedes-Benz", model="C-Class")

        response = client.get("/api/vehicles/search?make=mercedes", headers=user_headers)

        assert len(response.json()) == 1

    def test_searches_by_model(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, model="Camry")
        create_vehicle(client, admin_headers, make="Honda", model="Civic")

        response = client.get("/api/vehicles/search?model=civic", headers=user_headers)

        body = response.json()
        assert len(body) == 1
        assert body[0]["model"] == "Civic"

    def test_searches_by_category(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, category="Sedan")
        create_vehicle(client, admin_headers, make="Ford", model="Explorer", category="SUV")

        response = client.get("/api/vehicles/search?category=suv", headers=user_headers)

        body = response.json()
        assert len(body) == 1
        assert body[0]["category"] == "SUV"

    def test_filters_by_minimum_price(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, model="Cheap", price="10000.00")
        create_vehicle(client, admin_headers, model="Pricey", price="50000.00")

        response = client.get("/api/vehicles/search?min_price=20000", headers=user_headers)

        body = response.json()
        assert len(body) == 1
        assert body[0]["model"] == "Pricey"

    def test_filters_by_maximum_price(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, model="Cheap", price="10000.00")
        create_vehicle(client, admin_headers, model="Pricey", price="50000.00")

        response = client.get("/api/vehicles/search?max_price=20000", headers=user_headers)

        body = response.json()
        assert len(body) == 1
        assert body[0]["model"] == "Cheap"

    def test_filters_by_price_range(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, model="Low", price="10000.00")
        create_vehicle(client, admin_headers, model="Mid", price="25000.00")
        create_vehicle(client, admin_headers, model="High", price="90000.00")

        response = client.get(
            "/api/vehicles/search?min_price=15000&max_price=35000", headers=user_headers
        )

        body = response.json()
        assert len(body) == 1
        assert body[0]["model"] == "Mid"

    def test_price_bounds_are_inclusive(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers, price="25000.00")

        response = client.get(
            "/api/vehicles/search?min_price=25000&max_price=25000", headers=user_headers
        )

        assert len(response.json()) == 1

    def test_combines_every_filter(self, client, admin_headers, user_headers):
        create_vehicle(
            client, admin_headers, make="Toyota", model="Camry", category="Sedan", price="25000.00"
        )
        create_vehicle(
            client, admin_headers, make="Toyota", model="RAV4", category="SUV", price="30000.00"
        )
        create_vehicle(
            client, admin_headers, make="Honda", model="Accord", category="Sedan", price="26000.00"
        )

        response = client.get(
            "/api/vehicles/search?make=Toyota&category=Sedan&min_price=15000&max_price=35000",
            headers=user_headers,
        )

        body = response.json()
        assert len(body) == 1
        assert body[0]["model"] == "Camry"

    def test_returns_an_empty_list_when_nothing_matches(self, client, admin_headers, user_headers):
        create_vehicle(client, admin_headers)

        response = client.get("/api/vehicles/search?make=Lamborghini", headers=user_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_rejects_a_negative_minimum_price(self, client, user_headers):
        response = client.get("/api/vehicles/search?min_price=-5", headers=user_headers)

        assert response.status_code == 422

    def test_rejects_an_inverted_price_range(self, client, user_headers):
        response = client.get(
            "/api/vehicles/search?min_price=50000&max_price=10000", headers=user_headers
        )

        assert response.status_code == 422


class TestUpdateVehicle:
    def test_updates_a_full_vehicle_body(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.put(
            f"/api/vehicles/{created['id']}",
            json={
                "make": "Honda",
                "model": "Accord",
                "category": "Sedan",
                "price": "27500.50",
                "quantity": 4,
            },
            headers=admin_headers,
        )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["make"] == "Honda"
        assert body["model"] == "Accord"
        assert Decimal(str(body["price"])) == Decimal("27500.50")
        assert body["quantity"] == 4

    def test_updates_a_partial_body(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.put(
            f"/api/vehicles/{created['id']}", json={"price": "31000.00"}, headers=admin_headers
        )

        assert response.status_code == 200
        body = response.json()
        assert Decimal(str(body["price"])) == Decimal("31000.00")
        assert body["make"] == "Toyota"

    def test_returns_404_for_an_unknown_vehicle(self, client, admin_headers):
        response = client.put(
            "/api/vehicles/999999", json={"price": "100.00"}, headers=admin_headers
        )

        assert response.status_code == 404

    def test_rejects_an_invalid_price(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.put(
            f"/api/vehicles/{created['id']}", json={"price": "-1.00"}, headers=admin_headers
        )

        assert response.status_code == 422

    def test_rejects_a_negative_quantity(self, client, admin_headers):
        created = create_vehicle(client, admin_headers)

        response = client.put(
            f"/api/vehicles/{created['id']}", json={"quantity": -3}, headers=admin_headers
        )

        assert response.status_code == 422


class TestDeleteVehicle:
    def test_deletes_a_vehicle(self, client, admin_headers, user_headers):
        created = create_vehicle(client, admin_headers)

        response = client.delete(f"/api/vehicles/{created['id']}", headers=admin_headers)

        assert response.status_code == 204, response.text
        follow_up = client.get(f"/api/vehicles/{created['id']}", headers=user_headers)
        assert follow_up.status_code == 404

    def test_returns_404_for_an_unknown_vehicle(self, client, admin_headers):
        response = client.delete("/api/vehicles/999999", headers=admin_headers)

        assert response.status_code == 404
