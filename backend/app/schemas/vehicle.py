"""Vehicle request/response schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

PriceField = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
QuantityField = Annotated[int, Field(ge=0)]
ShortText = Annotated[str, Field(min_length=1, max_length=80)]
CategoryText = Annotated[str, Field(min_length=1, max_length=50)]
YearField = Annotated[int, Field(ge=1900, le=2100)]


def _strip_non_blank(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


class VehicleCreate(BaseModel):
    make: ShortText
    model: ShortText
    category: CategoryText
    price: PriceField
    quantity: QuantityField = 0
    year: YearField | None = None
    description: str | None = None
    image_url: Annotated[str, Field(max_length=500)] | None = None

    @field_validator("make", "model", "category")
    @classmethod
    def no_blank_text(cls, value: str) -> str:
        return _strip_non_blank(value)


class VehicleUpdate(BaseModel):
    """Every field is optional so callers may send a full or partial body."""

    make: ShortText | None = None
    model: ShortText | None = None
    category: CategoryText | None = None
    price: PriceField | None = None
    quantity: QuantityField | None = None
    year: YearField | None = None
    description: str | None = None
    image_url: Annotated[str, Field(max_length=500)] | None = None

    @field_validator("make", "model", "category")
    @classmethod
    def no_blank_text(cls, value: str | None) -> str | None:
        return None if value is None else _strip_non_blank(value)


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    make: str
    model: str
    category: str
    price: Decimal
    quantity: int
    year: int | None
    description: str | None
    image_url: str | None
    created_at: datetime
    updated_at: datetime


class RestockRequest(BaseModel):
    quantity: Annotated[int, Field(gt=0)]
