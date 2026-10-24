"""Vehicle and inventory endpoints.

Access control, as documented in the README: browsing, searching and
purchasing are open to any authenticated user; creating, updating, deleting
and restocking require an administrator.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.dependencies import AdminUser, CurrentUser, DbSession
from app.schemas.vehicle import RestockRequest, VehicleCreate, VehicleRead, VehicleUpdate
from app.services import vehicle_service
from app.services.vehicle_service import OutOfStockError, VehicleNotFoundError

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])

NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

LimitQuery = Annotated[int | None, Query(ge=1, le=200, description="Maximum rows to return")]
OffsetQuery = Annotated[int, Query(ge=0, description="Rows to skip")]
PriceQuery = Annotated[Decimal | None, Query(ge=0, max_digits=12, decimal_places=2)]
TermQuery = Annotated[str | None, Query(max_length=80)]


@router.get("", response_model=list[VehicleRead])
def list_vehicles(
    db: DbSession,
    current_user: CurrentUser,
    limit: LimitQuery = None,
    offset: OffsetQuery = 0,
) -> list[VehicleRead]:
    """Full inventory. Pagination is optional; the response is always a list."""
    vehicles = vehicle_service.list_vehicles(db, limit=limit, offset=offset)
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


@router.get("/search", response_model=list[VehicleRead])
def search_vehicles(
    db: DbSession,
    current_user: CurrentUser,
    q: TermQuery = None,
    make: TermQuery = None,
    model: TermQuery = None,
    category: TermQuery = None,
    min_price: PriceQuery = None,
    max_price: PriceQuery = None,
    limit: LimitQuery = None,
    offset: OffsetQuery = 0,
) -> list[VehicleRead]:
    """Filter inventory.

    `q` is a free-text term matched against make OR model; the named filters
    are ANDed on top. Text matching is case-insensitive substring matching and
    every filter may be combined.
    """
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_price must not be greater than max_price",
        )
    vehicles = vehicle_service.search_vehicles(
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
    return [VehicleRead.model_validate(vehicle) for vehicle in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(vehicle_id: int, db: DbSession, current_user: CurrentUser) -> VehicleRead:
    try:
        return VehicleRead.model_validate(vehicle_service.get_vehicle(db, vehicle_id))
    except VehicleNotFoundError as exc:
        raise NOT_FOUND from exc


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: DbSession, admin: AdminUser) -> VehicleRead:
    return VehicleRead.model_validate(vehicle_service.create_vehicle(db, payload))


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: int, payload: VehicleUpdate, db: DbSession, admin: AdminUser
) -> VehicleRead:
    try:
        return VehicleRead.model_validate(vehicle_service.update_vehicle(db, vehicle_id, payload))
    except VehicleNotFoundError as exc:
        raise NOT_FOUND from exc


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    # A 204 carries no body, so FastAPI must not infer one from the
    # "-> None" return annotation.
    response_model=None,
    response_class=Response,
)
def delete_vehicle(vehicle_id: int, db: DbSession, admin: AdminUser) -> None:
    try:
        vehicle_service.delete_vehicle(db, vehicle_id)
    except VehicleNotFoundError as exc:
        raise NOT_FOUND from exc


@router.post("/{vehicle_id}/purchase", response_model=VehicleRead)
def purchase_vehicle(vehicle_id: int, db: DbSession, current_user: CurrentUser) -> VehicleRead:
    """Buy one unit and return the updated inventory state."""
    try:
        return VehicleRead.model_validate(vehicle_service.purchase_vehicle(db, vehicle_id))
    except VehicleNotFoundError as exc:
        raise NOT_FOUND from exc
    except OutOfStockError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is out of stock",
        ) from exc


@router.post("/{vehicle_id}/restock", response_model=VehicleRead)
def restock_vehicle(
    vehicle_id: int, payload: RestockRequest, db: DbSession, admin: AdminUser
) -> VehicleRead:
    try:
        vehicle = vehicle_service.restock_vehicle(db, vehicle_id, payload.quantity)
    except VehicleNotFoundError as exc:
        raise NOT_FOUND from exc
    return VehicleRead.model_validate(vehicle)
