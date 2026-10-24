"""Idempotent demonstration data.

Run with:  python -m app.utils.seed

Every row is clearly marked as demo data in its description. Re-running the
script updates the existing demo rows instead of creating duplicates, keyed on
(make, model).

image_url is deliberately left empty: rather than point at third-party URLs
that may rot or carry unclear licensing, the frontend renders its own styled
placeholder per category.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Vehicle

DEMO_MARKER = "[Demo data]"

# make, model, category, price, quantity, year, blurb
DEMO_VEHICLES: list[tuple[str, str, str, str, int, int, str]] = [
    ("Toyota", "Camry", "Sedan", "25999.00", 12, 2024, "Dependable mid-size sedan."),
    ("Toyota", "RAV4", "SUV", "32499.00", 7, 2024, "Compact SUV with all-wheel drive."),
    ("Toyota", "Corolla", "Hatchback", "22150.00", 9, 2023, "Efficient hatchback for city driving."),
    ("Honda", "Civic", "Sedan", "24499.00", 10, 2024, "Sporty handling and low running costs."),
    ("Honda", "CR-V", "SUV", "31250.00", 5, 2023, "Family SUV with generous cargo space."),
    ("Hyundai", "i20", "Hatchback", "18499.00", 14, 2024, "Nimble hatchback, well equipped."),
    ("Hyundai", "Tucson", "SUV", "29999.00", 0, 2024, "Mid-size SUV. Awaiting restock."),
    ("Ford", "Mustang", "Coupe", "47999.00", 3, 2023, "Rear-wheel-drive performance coupe."),
    ("Ford", "Explorer", "SUV", "42500.00", 4, 2024, "Three-row SUV for longer trips."),
    ("BMW", "3 Series", "Sedan", "52999.00", 4, 2024, "Executive sedan with sharp dynamics."),
    ("BMW", "X5", "SUV", "71500.00", 2, 2024, "Luxury SUV, generously specified."),
    ("Mercedes-Benz", "C-Class", "Sedan", "56750.00", 3, 2024, "Refined cabin and ride comfort."),
    ("Mercedes-Benz", "GLE", "SUV", "78900.00", 0, 2023, "Large luxury SUV. Awaiting restock."),
    ("Audi", "A4", "Sedan", "49999.00", 6, 2024, "Balanced saloon with quattro options."),
    ("Audi", "Q5", "SUV", "58250.00", 3, 2023, "Premium compact SUV."),
    ("Tesla", "Model 3", "Electric", "44990.00", 8, 2024, "Long-range electric saloon."),
    ("Tesla", "Model Y", "Electric", "52990.00", 5, 2024, "Electric crossover with large boot."),
    ("Hyundai", "Ioniq 5", "Electric", "47500.00", 2, 2024, "800V electric crossover, rapid charging."),
]


def seed_vehicles(db: Session) -> tuple[int, int]:
    """Insert missing demo vehicles and refresh existing ones.

    Returns (created, updated).
    """
    created = 0
    updated = 0

    for make, model, category, price, quantity, year, blurb in DEMO_VEHICLES:
        existing = db.scalar(
            select(Vehicle).where(
                func.lower(Vehicle.make) == make.lower(),
                func.lower(Vehicle.model) == model.lower(),
            )
        )
        description = f"{DEMO_MARKER} {blurb}"

        if existing is None:
            db.add(
                Vehicle(
                    make=make,
                    model=model,
                    category=category,
                    price=Decimal(price),
                    quantity=quantity,
                    year=year,
                    description=description,
                    image_url=None,
                )
            )
            created += 1
        else:
            existing.category = category
            existing.price = Decimal(price)
            existing.quantity = quantity
            existing.year = year
            existing.description = description
            updated += 1

    db.commit()
    return created, updated


def main() -> None:
    db = SessionLocal()
    try:
        created, updated = seed_vehicles(db)
        total = db.scalar(select(func.count()).select_from(Vehicle))
    finally:
        db.close()
    print(f"Seed complete: {created} created, {updated} updated. {total} vehicles in inventory.")


if __name__ == "__main__":
    main()
