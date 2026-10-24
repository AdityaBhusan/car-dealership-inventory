"""The demo seed script must be idempotent and clearly marked."""

from sqlalchemy import func, select

from app.models import Vehicle
from app.utils.seed import DEMO_MARKER, DEMO_VEHICLES, seed_vehicles


def _count(db) -> int:
    return db.scalar(select(func.count()).select_from(Vehicle))


class TestSeed:
    def test_seeding_populates_the_inventory(self, db_session):
        created, updated = seed_vehicles(db_session)

        assert created == len(DEMO_VEHICLES)
        assert updated == 0
        assert _count(db_session) == len(DEMO_VEHICLES)

    def test_seeding_twice_does_not_duplicate_rows(self, db_session):
        seed_vehicles(db_session)
        first_count = _count(db_session)

        created, updated = seed_vehicles(db_session)

        assert created == 0
        assert updated == len(DEMO_VEHICLES)
        assert _count(db_session) == first_count

    def test_every_seeded_row_is_marked_as_demo_data(self, db_session):
        seed_vehicles(db_session)

        descriptions = db_session.scalars(select(Vehicle.description)).all()
        assert all(DEMO_MARKER in description for description in descriptions)

    def test_seed_includes_at_least_two_out_of_stock_vehicles(self, db_session):
        seed_vehicles(db_session)

        out_of_stock = db_session.scalar(
            select(func.count()).select_from(Vehicle).where(Vehicle.quantity == 0)
        )
        assert out_of_stock >= 2

    def test_seed_spans_several_makes_and_categories(self, db_session):
        seed_vehicles(db_session)

        makes = set(db_session.scalars(select(Vehicle.make)).all())
        categories = set(db_session.scalars(select(Vehicle.category)).all())
        assert len(makes) >= 6
        assert {"Sedan", "SUV", "Hatchback", "Coupe", "Electric"} <= categories

    def test_seed_prices_are_all_positive(self, db_session):
        seed_vehicles(db_session)

        cheapest = db_session.scalar(select(func.min(Vehicle.price)))
        assert cheapest > 0

    def test_seeded_inventory_is_visible_through_the_api(self, client, db_session, user_headers):
        seed_vehicles(db_session)

        response = client.get("/api/vehicles", headers=user_headers)

        assert response.status_code == 200
        assert len(response.json()) == len(DEMO_VEHICLES)
