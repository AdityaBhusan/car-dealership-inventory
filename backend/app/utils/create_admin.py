"""Create or promote the initial administrator.

Credentials come from the environment, never from the command line or source:

    $env:ADMIN_EMAIL = "admin@yourdomain.com"
    $env:ADMIN_NAME = "Inventory Administrator"
    $env:ADMIN_PASSWORD = "<a strong password>"
    python -m app.utils.create_admin

Safe to re-run: an existing account with that email is promoted to admin and
its password is left alone unless --reset-password is passed.
"""

from __future__ import annotations

import argparse
import os
import sys

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import UserRole
from app.services import auth_service

MIN_PASSWORD_LENGTH = 8


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="also set the password from ADMIN_PASSWORD when the account already exists",
    )
    args = parser.parse_args()

    email = os.getenv("ADMIN_EMAIL", "").strip()
    name = os.getenv("ADMIN_NAME", "Inventory Administrator").strip()
    password = os.getenv("ADMIN_PASSWORD", "")

    if not email:
        print("ADMIN_EMAIL is not set.", file=sys.stderr)
        return 1
    if len(password) < MIN_PASSWORD_LENGTH:
        print(
            f"ADMIN_PASSWORD must be set and at least {MIN_PASSWORD_LENGTH} characters.",
            file=sys.stderr,
        )
        return 1

    db = SessionLocal()
    try:
        existing = auth_service.get_user_by_email(db, email)
        if existing is None:
            user = auth_service.create_user(
                db, name=name, email=email, password=password, role=UserRole.ADMIN
            )
            db.commit()
            print(f"Created administrator {user.email} (id={user.id}).")
            return 0

        changes = []
        if existing.role != UserRole.ADMIN.value:
            existing.role = UserRole.ADMIN.value
            changes.append("role promoted to admin")
        if args.reset_password:
            existing.hashed_password = hash_password(password)
            changes.append("password reset")
        db.commit()

        if changes:
            print(f"Updated {existing.email}: {', '.join(changes)}.")
        else:
            print(f"{existing.email} is already an administrator. Nothing to do.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
