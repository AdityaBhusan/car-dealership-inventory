"""Data-access helpers for vehicles.

Every query is built with SQLAlchemy constructs, so user-supplied values are
always sent as bound parameters.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Select, or_, select, update
from sqlalchemy.orm import Session

from app.models import Vehicle


def _contains(column, term: str) -> object:
    """Case-insensitive 'contains' match with LIKE wildcards escaped."""
    escaped = term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return column.ilike(f"%{escaped}%", escape="\\")


def build_search_query(
    *,
    q: str | None = None,
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
) -> Select:
    query = select(Vehicle)
    if q:
        # Free-text box: one term, matched against make OR model.
        query = query.where(or_(_contains(Vehicle.make, q), _contains(Vehicle.model, q)))
    if make:
        query = query.where(_contains(Vehicle.make, make))
    if model:
        query = query.where(_contains(Vehicle.model, model))
    if category:
        query = query.where(_contains(Vehicle.category, category))
    if min_price is not None:
        query = query.where(Vehicle.price >= min_price)
    if max_price is not None:
        query = query.where(Vehicle.price <= max_price)
    return query.order_by(Vehicle.id)


def list_vehicles(db: Session, *, limit: int | None = None, offset: int = 0) -> list[Vehicle]:
    query = select(Vehicle).order_by(Vehicle.id).offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return list(db.scalars(query))


def search_vehicles(
    db: Session,
    *,
    q: str | None = None,
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> list[Vehicle]:
    query = build_search_query(
        q=q,
        make=make,
        model=model,
        category=category,
        min_price=min_price,
        max_price=max_price,
    ).offset(offset)
    if limit is not None:
        query = query.limit(limit)
    return list(db.scalars(query))


def get_vehicle(db: Session, vehicle_id: int) -> Vehicle | None:
    return db.get(Vehicle, vehicle_id)


def vehicle_exists(db: Session, vehicle_id: int) -> bool:
    return db.scalar(select(Vehicle.id).where(Vehicle.id == vehicle_id)) is not None


def decrement_stock_if_available(db: Session, vehicle_id: int) -> Vehicle | None:
    """Atomically take one unit off the shelf.

    The 'quantity > 0' predicate lives inside the UPDATE, so two concurrent
    purchases of the last unit cannot both succeed: PostgreSQL re-evaluates
    the predicate against the committed row version after the row lock is
    released. Returns None when no row matched (missing or out of stock).
    """
    statement = (
        update(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.quantity > 0)
        .values(quantity=Vehicle.quantity - 1)
        .returning(Vehicle)
    )
    result = db.execute(statement, execution_options={"synchronize_session": False})
    return result.scalar_one_or_none()


def increment_stock(db: Session, vehicle_id: int, amount: int) -> Vehicle | None:
    statement = (
        update(Vehicle)
        .where(Vehicle.id == vehicle_id)
        .values(quantity=Vehicle.quantity + amount)
        .returning(Vehicle)
    )
    result = db.execute(statement, execution_options={"synchronize_session": False})
    return result.scalar_one_or_none()
