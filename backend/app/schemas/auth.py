"""Authentication request/response schemas."""

from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, field_validator

NameField = Annotated[str, Field(min_length=1, max_length=120)]
PasswordField = Annotated[str, Field(min_length=8, max_length=128)]


class RegisterRequest(BaseModel):
    name: NameField
    email: EmailStr
    password: PasswordField

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("name must not be blank")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
