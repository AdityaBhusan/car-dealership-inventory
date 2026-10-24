"""Unit tests for the password-hashing and JWT helpers.

These need no database, so they run as pure unit tests.
"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_does_not_contain_the_plaintext(self):
        hashed = hash_password("SecurePass123!")

        assert "SecurePass123!" not in hashed
        assert hashed.startswith("$2")

    def test_hashes_are_salted_so_two_hashes_differ(self):
        assert hash_password("SamePassword1!") != hash_password("SamePassword1!")

    def test_verify_accepts_the_correct_password(self):
        hashed = hash_password("SecurePass123!")

        assert verify_password("SecurePass123!", hashed) is True

    def test_verify_rejects_the_wrong_password(self):
        hashed = hash_password("SecurePass123!")

        assert verify_password("WrongPassword1!", hashed) is False

    def test_verify_rejects_a_malformed_hash(self):
        assert verify_password("SecurePass123!", "not-a-bcrypt-hash") is False

    def test_verify_rejects_an_empty_hash(self):
        assert verify_password("SecurePass123!", "") is False

    def test_handles_passwords_longer_than_the_bcrypt_limit(self):
        long_password = "a" * 200

        hashed = hash_password(long_password)

        assert verify_password(long_password, hashed) is True

    def test_handles_multibyte_passwords(self):
        password = "pässwörd-ünïcode-123!"

        assert verify_password(password, hash_password(password)) is True


class TestAccessTokens:
    def test_token_round_trips_the_subject_and_role(self):
        token = create_access_token(subject=42, role="admin")

        claims = decode_access_token(token)

        assert claims is not None
        assert claims["sub"] == "42"
        assert claims["role"] == "admin"

    def test_token_carries_an_expiry(self):
        claims = decode_access_token(create_access_token(subject=1, role="user"))

        assert claims is not None
        assert "exp" in claims
        assert claims["exp"] > datetime.now(UTC).timestamp()

    def test_decoding_rejects_a_tampered_token(self):
        token = create_access_token(subject=1, role="user")

        tampered = token[:-4] + ("abcd" if not token.endswith("abcd") else "efgh")

        assert decode_access_token(tampered) is None

    def test_decoding_rejects_a_token_signed_with_another_secret(self):
        forged = jwt.encode(
            {"sub": "1", "role": "admin", "exp": datetime.now(UTC) + timedelta(hours=1)},
            "a-different-secret",
            algorithm="HS256",
        )

        assert decode_access_token(forged) is None

    def test_decoding_rejects_an_expired_token(self):
        settings = get_settings()
        expired = jwt.encode(
            {
                "sub": "1",
                "role": "user",
                "exp": datetime.now(UTC) - timedelta(seconds=1),
            },
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )

        assert decode_access_token(expired) is None

    def test_decoding_rejects_a_token_without_required_claims(self):
        settings = get_settings()
        incomplete = jwt.encode({"role": "user"}, settings.jwt_secret, algorithm="HS256")

        assert decode_access_token(incomplete) is None

    def test_decoding_rejects_rubbish(self):
        assert decode_access_token("not.a.jwt") is None

    @pytest.mark.parametrize("role", ["user", "admin"])
    def test_both_roles_round_trip(self, role):
        claims = decode_access_token(create_access_token(subject=7, role=role))

        assert claims is not None
        assert claims["role"] == role
