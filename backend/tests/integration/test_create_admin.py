"""The administrator bootstrap script.

Credentials must come from the environment and the script must be safe to
re-run.
"""

import pytest
from sqlalchemy import select

from app.models import User, UserRole
from app.utils import create_admin as script
from tests.conftest import TestSessionLocal, register_user


@pytest.fixture(autouse=True)
def use_test_database(monkeypatch):
    """Point the script at the isolated test database."""
    monkeypatch.setattr(script, "SessionLocal", TestSessionLocal)


@pytest.fixture(autouse=True)
def clear_admin_env(monkeypatch):
    for key in ("ADMIN_EMAIL", "ADMIN_NAME", "ADMIN_PASSWORD"):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setattr("sys.argv", ["create_admin"])


def set_env(monkeypatch, **values):
    for key, value in values.items():
        monkeypatch.setenv(key, value)


def fetch(db, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


class TestValidation:
    def test_fails_without_an_email(self, monkeypatch):
        set_env(monkeypatch, ADMIN_PASSWORD="StrongPass123!")

        assert script.main() == 1

    def test_fails_without_a_password(self, monkeypatch):
        set_env(monkeypatch, ADMIN_EMAIL="boss@example.com")

        assert script.main() == 1

    def test_fails_with_a_short_password(self, monkeypatch):
        set_env(monkeypatch, ADMIN_EMAIL="boss@example.com", ADMIN_PASSWORD="short")

        assert script.main() == 1

    def test_does_not_create_a_user_when_validation_fails(self, monkeypatch, db_session):
        set_env(monkeypatch, ADMIN_EMAIL="boss@example.com", ADMIN_PASSWORD="short")

        script.main()

        assert fetch(db_session, "boss@example.com") is None


class TestCreation:
    def test_creates_an_administrator(self, monkeypatch, db_session):
        set_env(
            monkeypatch,
            ADMIN_EMAIL="boss@example.com",
            ADMIN_NAME="The Boss",
            ADMIN_PASSWORD="StrongPass123!",
        )

        assert script.main() == 0

        admin = fetch(db_session, "boss@example.com")
        assert admin is not None
        assert admin.role == UserRole.ADMIN.value
        assert admin.name == "The Boss"
        assert "StrongPass123!" not in admin.hashed_password

    def test_the_created_administrator_can_log_in(self, monkeypatch, client):
        set_env(
            monkeypatch, ADMIN_EMAIL="boss@example.com", ADMIN_PASSWORD="StrongPass123!"
        )
        script.main()

        response = client.post(
            "/api/auth/login",
            json={"email": "boss@example.com", "password": "StrongPass123!"},
        )

        assert response.status_code == 200
        token = response.json()["access_token"]
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.json()["role"] == "admin"

    def test_rerunning_is_a_no_op(self, monkeypatch, db_session):
        set_env(
            monkeypatch, ADMIN_EMAIL="boss@example.com", ADMIN_PASSWORD="StrongPass123!"
        )
        script.main()
        original = fetch(db_session, "boss@example.com").hashed_password

        assert script.main() == 0

        db_session.expire_all()
        assert fetch(db_session, "boss@example.com").hashed_password == original


class TestPromotion:
    def test_promotes_an_existing_regular_user(self, monkeypatch, client, db_session):
        register_user(client, "promote@example.com")
        set_env(
            monkeypatch, ADMIN_EMAIL="promote@example.com", ADMIN_PASSWORD="StrongPass123!"
        )

        assert script.main() == 0

        db_session.expire_all()
        assert fetch(db_session, "promote@example.com").role == UserRole.ADMIN.value

    def test_promotion_keeps_the_original_password(self, monkeypatch, client):
        from tests.conftest import USER_PASSWORD

        register_user(client, "promote@example.com")
        set_env(
            monkeypatch, ADMIN_EMAIL="promote@example.com", ADMIN_PASSWORD="DifferentPass123!"
        )
        script.main()

        response = client.post(
            "/api/auth/login",
            json={"email": "promote@example.com", "password": USER_PASSWORD},
        )

        assert response.status_code == 200

    def test_reset_password_flag_replaces_the_password(self, monkeypatch, client):
        register_user(client, "promote@example.com")
        set_env(
            monkeypatch, ADMIN_EMAIL="promote@example.com", ADMIN_PASSWORD="BrandNewPass123!"
        )
        monkeypatch.setattr("sys.argv", ["create_admin", "--reset-password"])

        assert script.main() == 0

        response = client.post(
            "/api/auth/login",
            json={"email": "promote@example.com", "password": "BrandNewPass123!"},
        )
        assert response.status_code == 200
