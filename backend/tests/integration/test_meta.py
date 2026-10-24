"""Health check and API documentation."""


class TestHealth:
    def test_health_is_public_and_reports_ok(self, client):
        response = client.get("/api/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestOpenApi:
    def test_openapi_schema_lists_every_required_endpoint(self, client):
        paths = client.get("/openapi.json").json()["paths"]

        assert "post" in paths["/api/auth/register"]
        assert "post" in paths["/api/auth/login"]
        assert "get" in paths["/api/vehicles"]
        assert "post" in paths["/api/vehicles"]
        assert "get" in paths["/api/vehicles/search"]
        assert "put" in paths["/api/vehicles/{vehicle_id}"]
        assert "delete" in paths["/api/vehicles/{vehicle_id}"]
        assert "post" in paths["/api/vehicles/{vehicle_id}/purchase"]
        assert "post" in paths["/api/vehicles/{vehicle_id}/restock"]

    def test_swagger_ui_is_served(self, client):
        response = client.get("/docs")

        assert response.status_code == 200
