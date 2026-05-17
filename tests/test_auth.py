import unittest
from unittest.mock import patch

from tests.support import install_dependency_stubs


install_dependency_stubs()

from server import auth  # noqa: E402


class AuthHelpersTest(unittest.TestCase):
    def test_normalize_user_role_maps_moderator_aliases(self):
        self.assertEqual(auth.normalize_user_role("moder"), "moderator")
        self.assertEqual(auth.normalize_user_role("MOD"), "moderator")
        self.assertEqual(auth.normalize_user_role(" user "), "user")
        self.assertEqual(auth.normalize_user_role(None), "user")

    def test_build_user_payload_includes_normalized_role(self):
        payload = auth.build_user_payload(
            {
                "id": "local_1",
                "name": "Ivan Petrov",
                "username": "ivan",
                "avatar_url": "/img.png",
                "platform": "local",
                "email": "ivan@example.com",
                "role": "mod",
            }
        )

        self.assertEqual(payload["user_id"], "local_1")
        self.assertEqual(payload["first_name"], "Ivan")
        self.assertEqual(payload["last_name"], "Petrov")
        self.assertEqual(payload["role"], "moderator")

    def test_create_auth_response_embeds_role_in_token_payload(self):
        user_row = {
            "id": "local_2",
            "name": "Anna",
            "username": "anna",
            "avatar_url": None,
            "platform": "local",
            "email": "anna@example.com",
            "role": "moderator",
        }

        with patch.object(auth, "get_jwt_secret", return_value="secret"), patch.object(
            auth,
            "get_jwt_expires_in_seconds",
            return_value=3600,
        ):
            response = auth.create_auth_response(user_row)

        self.assertEqual(response["user"]["role"], "moderator")
        self.assertEqual(response["token"]["sub"], "local_2")
        self.assertEqual(response["token"]["role"], "moderator")
        self.assertEqual(response["token"]["platform"], "local")

    def test_validate_password_strength_rejects_weak_password(self):
        self.assertIsNotNone(auth.validate_password_strength("short"))
        self.assertIsNone(auth.validate_password_strength("StrongPass1"))
