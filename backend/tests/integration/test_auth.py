"""Authentication and registration behaviour."""

from sqlalchemy import text

from tests.conftest import USER_PASSWORD, auth_header, login, register_user


class TestRegistration:
    def test_register_returns_created_user_without_password_hash(self, client):
        response = register_user(client, "john@example.com", name="John Doe")

        assert response.status_code == 201, response.text
        body = response.json()
        assert body["email"] == "john@example.com"
        assert body["name"] == "John Doe"
        assert body["role"] == "user"
        assert "id" in body
        assert "hashed_password" not in body
        assert "password" not in body

    def test_register_rejects_duplicate_email(self, client):
        register_user(client, "dup@example.com")

        response = register_user(client, "dup@example.com")

        assert response.status_code == 409

    def test_register_rejects_duplicate_email_differing_only_in_case(self, client):
        register_user(client, "mixed@example.com")

        response = register_user(client, "MIXED@Example.com")

        assert response.status_code == 409

    def test_register_normalizes_email_to_lowercase(self, client):
        response = register_user(client, "  CAPS@Example.COM  ")

        assert response.status_code == 201
        assert response.json()["email"] == "caps@example.com"

    def test_register_rejects_invalid_email(self, client):
        response = register_user(client, "not-an-email")

        assert response.status_code == 422

    def test_register_rejects_short_password(self, client):
        response = register_user(client, "shortpw@example.com", password="abc")

        assert response.status_code == 422

    def test_register_rejects_blank_name(self, client):
        response = client.post(
            "/api/auth/register",
            json={"name": "   ", "email": "blank@example.com", "password": USER_PASSWORD},
        )

        assert response.status_code == 422

    def test_register_rejects_missing_fields(self, client):
        response = client.post("/api/auth/register", json={"email": "x@example.com"})

        assert response.status_code == 422

    def test_register_cannot_self_assign_admin_role(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Sneaky",
                "email": "sneaky@example.com",
                "password": USER_PASSWORD,
                "role": "admin",
            },
        )

        assert response.status_code == 201
        assert response.json()["role"] == "user"

    def test_password_is_not_stored_in_plaintext(self, client, db_session):
        register_user(client, "hashed@example.com")

        stored = db_session.execute(
            text("SELECT hashed_password FROM users WHERE email = :email"),
            {"email": "hashed@example.com"},
        ).scalar_one()
        assert USER_PASSWORD not in stored
        assert len(stored) > 20


class TestLogin:
    def test_login_returns_bearer_token(self, client):
        register_user(client, "login@example.com")

        response = client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": USER_PASSWORD},
        )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]

    def test_login_is_case_insensitive_on_email(self, client):
        register_user(client, "case@example.com")

        response = client.post(
            "/api/auth/login",
            json={"email": "CASE@EXAMPLE.COM", "password": USER_PASSWORD},
        )

        assert response.status_code == 200

    def test_login_rejects_wrong_password(self, client):
        register_user(client, "wrongpw@example.com")

        response = client.post(
            "/api/auth/login",
            json={"email": "wrongpw@example.com", "password": "TotallyWrong1!"},
        )

        assert response.status_code == 401

    def test_login_rejects_unknown_email(self, client):
        response = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": USER_PASSWORD},
        )

        assert response.status_code == 401


class TestCurrentUser:
    def test_me_returns_the_authenticated_user(self, client):
        register_user(client, "me@example.com", name="Me Myself")
        token = login(client, "me@example.com", USER_PASSWORD)

        response = client.get("/api/auth/me", headers=auth_header(token))

        assert response.status_code == 200, response.text
        assert response.json()["email"] == "me@example.com"
        assert response.json()["name"] == "Me Myself"

    def test_me_requires_a_token(self, client):
        response = client.get("/api/auth/me")

        assert response.status_code == 401

    def test_me_rejects_a_malformed_token(self, client):
        response = client.get("/api/auth/me", headers=auth_header("not.a.jwt"))

        assert response.status_code == 401

    def test_me_rejects_a_token_signed_with_the_wrong_secret(self, client):
        import jwt

        forged = jwt.encode({"sub": "1"}, "the-wrong-secret", algorithm="HS256")

        response = client.get("/api/auth/me", headers=auth_header(forged))

        assert response.status_code == 401

    def test_me_rejects_an_expired_token(self, client):
        from datetime import UTC, datetime, timedelta

        import jwt

        from app.core.config import get_settings

        settings = get_settings()
        expired = jwt.encode(
            {
                "sub": "1",
                "role": "user",
                "exp": datetime.now(UTC) - timedelta(minutes=5),
            },
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )

        response = client.get("/api/auth/me", headers=auth_header(expired))

        assert response.status_code == 401

    def test_me_rejects_a_token_for_a_deleted_user(self, client, db_session):
        register_user(client, "ghost@example.com")
        token = login(client, "ghost@example.com", USER_PASSWORD)
        db_session.execute(text("DELETE FROM users WHERE email = 'ghost@example.com'"))
        db_session.commit()

        response = client.get("/api/auth/me", headers=auth_header(token))

        assert response.status_code == 401
