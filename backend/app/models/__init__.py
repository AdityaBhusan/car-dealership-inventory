"""ORM models. Importing this package registers every table on the shared Base."""

from app.models.user import User, UserRole
from app.models.vehicle import Vehicle

__all__ = ["User", "UserRole", "Vehicle"]
