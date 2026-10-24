"""Vehicle and inventory business rules.

The service raises domain errors; the router turns them into HTTP responses.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import Vehicle
from app.repositories import vehicle_repository as repo
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


class VehicleNotFoundError(Exception):
    """No vehicle exists with the requested id."""


class OutOfStockError(Exception):
    """The vehicle exists but has no units available."""


def list_vehicles(db: Session, *, limit: int | None = None, offset: int = 0) -> list[Vehicle]:
    return repo.list_vehicles(db, limit=limit, offset=offset)


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
    return repo.search_vehicles(
        db,
        q=q,
        make=make,
        model=model,
        category=category,
        min_price=min_price,
        max_price=max_price,
        limit=limit,
        offset=offset,
    )


def get_vehicle(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = repo.get_vehicle(db, vehicle_id)
    if vehicle is None:
        raise VehicleNotFoundError
    return vehicle


def create_vehicle(db: Session, payload: VehicleCreate) -> Vehicle:
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def update_vehicle(db: Session, vehicle_id: int, payload: VehicleUpdate) -> Vehicle:
    vehicle = get_vehicle(db, vehicle_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def delete_vehicle(db: Session, vehicle_id: int) -> None:
    vehicle = get_vehicle(db, vehicle_id)
    db.delete(vehicle)
    db.commit()


def purchase_vehicle(db: Session, vehicle_id: int) -> Vehicle:
    """Sell one unit. Atomic, so stock can never go negative."""
    vehicle = repo.decrement_stock_if_available(db, vehicle_id)
    if vehicle is None:
        db.rollback()
        # Distinguish "no such vehicle" from "nothing left in stock".
        if not repo.vehicle_exists(db, vehicle_id):
            raise VehicleNotFoundError
        raise OutOfStockError
    db.commit()
    db.refresh(vehicle)
    return vehicle


def restock_vehicle(db: Session, vehicle_id: int, amount: int) -> Vehicle:
    """Add units to stock atomically."""
    if amount <= 0:
        raise ValueError("restock quantity must be a positive integer")
    vehicle = repo.increment_stock(db, vehicle_id, amount)
    if vehicle is None:
        db.rollback()
        raise VehicleNotFoundError
    db.commit()
    db.refresh(vehicle)
    return vehicle
