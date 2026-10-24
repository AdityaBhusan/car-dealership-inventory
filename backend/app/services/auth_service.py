"""User registration and authentication logic."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User, UserRole


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == normalize_email(email)))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def email_is_taken(db: Session, email: str) -> bool:
    return get_user_by_email(db, email) is not None


def create_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    role: UserRole = UserRole.USER,
) -> User:
    """Persist a new user. The caller controls the role; public registration
    always passes the default so it can never create an administrator."""
    user = User(
        name=name.strip(),
        email=normalize_email(email),
        hashed_password=hash_password(password),
        role=UserRole(role).value,
    )
    db.add(user)
    db.flush()
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
