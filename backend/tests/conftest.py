"""Shared pytest fixtures.

Integration tests run against a real, isolated PostgreSQL database
(TEST_DATABASE_URL). The schema is created by running the Alembic migrations
once per session, so the tests exercise the same DDL that production uses.
Tables are truncated between tests, which keeps real COMMITs available for the
concurrency tests.
"""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

settings = get_settings()
TEST_DATABASE_URL = settings.test_database_url
if not TEST_DATABASE_URL:
    raise RuntimeError("TEST_DATABASE_URL must be set to run the test suite")

test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True, future=True)
TestSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)

USER_PASSWORD = "SecurePass123!"
ADMIN_PASSWORD = "AdminPass123!"


@pytest.fixture(scope="session", autouse=True)
def apply_migrations() -> None:
    """Build the test schema with the real Alembic migrations."""
    config = Config(os.path.join(BACKEND_ROOT, "alembic.ini"))
    config.set_main_option("script_location", os.path.join(BACKEND_ROOT, "alembic"))
    os.environ["ALEMBIC_DATABASE_URL"] = TEST_DATABASE_URL
    command.upgrade(config, "head")


@pytest.fixture(autouse=True)
def clean_tables() -> Generator[None, None, None]:
    """Give every test an empty database."""
    with test_engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE vehicles, users RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """TestClient (httpx-backed) wired to the isolated test database."""
    from app.db.session import get_db
    from app.main import app

    def override_get_db() -> Generator[Session, None, None]:
        session = TestSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# --- helpers -------------------------------------------------------------


def register_user(
    client: TestClient,
    email: str,
    password: str = USER_PASSWORD,
    name: str = "Test User",
):
    return client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )


def login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_token(client: TestClient) -> str:
    register_user(client, "user@example.com")
    return login(client, "user@example.com", USER_PASSWORD)


@pytest.fixture
def user_headers(user_token: str) -> dict[str, str]:
    return auth_header(user_token)


@pytest.fixture
def admin_token(client: TestClient, db_session: Session) -> str:
    """Create an admin directly in the database, as the bootstrap script does."""
    from app.models import UserRole
    from app.services.auth_service import create_user

    create_user(
        db_session,
        name="Admin User",
        email="admin@example.com",
        password=ADMIN_PASSWORD,
        role=UserRole.ADMIN,
    )
    db_session.commit()
    return login(client, "admin@example.com", ADMIN_PASSWORD)


@pytest.fixture
def admin_headers(admin_token: str) -> dict[str, str]:
    return auth_header(admin_token)


VEHICLE_PAYLOAD = {
    "make": "Toyota",
    "model": "Camry",
    "category": "Sedan",
    "price": "25000.00",
    "quantity": 10,
}


def create_vehicle(client: TestClient, headers: dict[str, str], **overrides) -> dict:
    """Create a vehicle through the API and return the response body."""
    payload = {**VEHICLE_PAYLOAD, **overrides}
    response = client.post("/api/vehicles", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()
