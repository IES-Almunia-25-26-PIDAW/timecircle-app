"""
test_serializers_users.py – Tests de los serializers relacionados con usuarios.

Cubre:
  · UserRegistrationSerializer  → validaciones de email, username, contraseñas
  · UserSerializer              → campos de lectura, computed fields
  · UserUpdateSerializer        → validación de avatar URL, nombre/apellido
  · UserRankingSerializer       → campos del ranking
  · UserSkillSerializer         → creación de relación usuario-habilidad
  · AdminUserSerializer         → campos del panel de admin
  · AdminUserUpdateSerializer   → validación de créditos negativos
"""

from django.test import TestCase, RequestFactory
import decimal

from api.models import User, Skill, UserSkill
from api.serializers import (
    CategorySerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    UserRankingSerializer,
    UserSkillSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
)
from .factories import make_user, make_skill, make_completed_trade, make_review


class CategorySerializerTests(TestCase):

    def test_serializes_catalog_fields(self):
        from .factories import make_category

        category = make_category(
            name="Idiomas",
            description="Clases y conversación",
            icon="languages",
        )
        data = CategorySerializer(category).data
        self.assertEqual(data["name"], "Idiomas")
        self.assertEqual(data["description"], "Clases y conversación")
        self.assertEqual(data["icon"], "languages")


def _mock_request(user=None, method="GET"):
    """Crea un objeto request simulado con el usuario autenticado."""
    factory = RequestFactory()
    request = getattr(factory, method.lower())("/")
    request.user = user
    return request


# ══════════════════════════════════════════════
#  USER REGISTRATION
# ══════════════════════════════════════════════

class UserRegistrationSerializerTests(TestCase):

    def _valid_data(self, **overrides):
        data = {
            "username":   "newuser",
            "email":      "new@example.com",
            "first_name": "Ana",
            "last_name":  "García",
            "password":   "Secure!Pass1",
            "password2":  "Secure!Pass1",
            "location":   "Madrid",
            "bio":        "Hola mundo",
        }
        data.update(overrides)
        return data

    def test_valid_registration(self):
        s = UserRegistrationSerializer(data=self._valid_data())
        self.assertTrue(s.is_valid(), s.errors)
        user = s.save()
        self.assertIsInstance(user, User)
        self.assertEqual(user.credits, decimal.Decimal('0.0'))

    def test_email_normalized_to_lowercase(self):
        s = UserRegistrationSerializer(data=self._valid_data(email="UPPER@EXAMPLE.COM"))
        self.assertTrue(s.is_valid(), s.errors)
        user = s.save()
        self.assertEqual(user.email, "upper@example.com")

    def test_duplicate_email_rejected(self):
        make_user(email="dup@example.com")
        s = UserRegistrationSerializer(data=self._valid_data(email="dup@example.com"))
        self.assertFalse(s.is_valid())
        self.assertIn("email", s.errors)

    def test_duplicate_username_rejected(self):
        make_user(username="taken")
        s = UserRegistrationSerializer(data=self._valid_data(username="taken"))
        self.assertFalse(s.is_valid())
        self.assertIn("username", s.errors)

    def test_passwords_mismatch_rejected(self):
        s = UserRegistrationSerializer(
            data=self._valid_data(password="Secure!Pass1", password2="Different!1")
        )
        self.assertFalse(s.is_valid())
        self.assertIn("password", s.errors)

    def test_weak_password_rejected(self):
        s = UserRegistrationSerializer(data=self._valid_data(password="1234", password2="1234"))
        self.assertFalse(s.is_valid())

    def test_missing_required_fields(self):
        for field in ["first_name", "last_name", "email"]:
            data = self._valid_data()
            data.pop(field)
            s = UserRegistrationSerializer(data=data)
            self.assertFalse(s.is_valid(), f"Debería fallar sin '{field}'")
            self.assertIn(field, s.errors)

    def test_password_not_exposed_in_representation(self):
        s = UserRegistrationSerializer(data=self._valid_data())
        s.is_valid()
        user = s.save()
        read_s = UserSerializer(user)
        self.assertNotIn("password", read_s.data)


# ══════════════════════════════════════════════
#  USER SERIALIZER (lectura)
# ══════════════════════════════════════════════

class UserSerializerTests(TestCase):

    def setUp(self):
        self.user = make_user(
            username="alice",
            email="alice@x.com",
            first_name="Alice",
            last_name="Smith",
        )

    def test_name_field_returns_full_name(self):
        data = UserSerializer(self.user).data
        self.assertEqual(data["name"], "Alice Smith")

    def test_name_field_falls_back_to_username(self):
        user = make_user(
            username="noname",
            email="noname@x.com",
            first_name="",
            last_name="",
        )
        data = UserSerializer(user).data
        self.assertEqual(data["name"], "noname")

    def test_skills_empty_by_default(self):
        data = UserSerializer(self.user).data
        self.assertEqual(data["skills"], [])

    def test_skills_lists_skill_names(self):
        skill = make_skill("Django")
        UserSkill.objects.create(user=self.user, skill=skill)
        data = UserSerializer(self.user).data
        self.assertIn("Django", data["skills"])

    def test_is_admin_false_for_regular_user(self):
        data = UserSerializer(self.user).data
        self.assertFalse(data["is_admin"])

    def test_read_only_fields_not_writable(self):
        """credits, rating, badge, etc. no deben poder editarse vía este serializer."""
        s = UserSerializer(
            self.user,
            data={"credits": 9999, "badge": "gold"},
            partial=True,
        )
        # La validación pasará pero los campos read_only no se modifican
        s.is_valid()
        # No deben estar en validated_data
        self.assertNotIn("credits", s.validated_data)
        self.assertNotIn("badge", s.validated_data)

    def test_public_representation_hides_exact_location(self):
        self.user.street_address = "Calle Mayor 1"
        self.user.postal_code = "28013"
        self.user.latitude = 40.4168
        self.user.longitude = -3.7038
        self.user.save()

        data = UserSerializer(self.user).data

        self.assertNotIn("street_address", data)
        self.assertNotIn("postal_code", data)
        self.assertNotIn("latitude", data)
        self.assertNotIn("longitude", data)

    def test_owner_can_see_exact_location(self):
        self.user.street_address = "Calle Mayor 1"
        self.user.postal_code = "28013"
        self.user.latitude = 40.4168
        self.user.longitude = -3.7038
        self.user.save()

        data = UserSerializer(
            self.user,
            context={"request": _mock_request(self.user)},
        ).data

        self.assertEqual(data["street_address"], "Calle Mayor 1")
        self.assertEqual(data["postal_code"], "28013")
        self.assertEqual(float(data["latitude"]), 40.4168)
        self.assertEqual(float(data["longitude"]), -3.7038)

    def test_staff_can_see_exact_location(self):
        admin = make_user(username="staff", email="staff@x.com", is_staff=True)
        self.user.street_address = "Calle Mayor 1"
        self.user.postal_code = "28013"
        self.user.save()

        data = UserSerializer(
            self.user,
            context={"request": _mock_request(admin)},
        ).data

        self.assertEqual(data["street_address"], "Calle Mayor 1")
        self.assertEqual(data["postal_code"], "28013")

    def test_share_exact_location_opt_in_shows_exact_location(self):
        self.user.street_address = "Calle Mayor 1"
        self.user.postal_code = "28013"
        self.user.share_exact_location = True
        self.user.save()

        data = UserSerializer(self.user).data

        self.assertEqual(data["street_address"], "Calle Mayor 1")
        self.assertEqual(data["postal_code"], "28013")

    def test_request_user_comparison_errors_hide_exact_location(self):
        class BrokenUser:
            is_authenticated = True
            is_staff = False

            def __eq__(self, other):
                raise RuntimeError("comparison failed")

        self.user.street_address = "Calle Mayor 1"
        self.user.postal_code = "28013"
        self.user.save()

        data = UserSerializer(
            self.user,
            context={"request": _mock_request(BrokenUser())},
        ).data

        self.assertNotIn("street_address", data)
        self.assertNotIn("postal_code", data)


# ══════════════════════════════════════════════
#  USER UPDATE SERIALIZER
# ══════════════════════════════════════════════

class UserUpdateSerializerTests(TestCase):

    def setUp(self):
        self.user = make_user()

    def test_valid_update(self):
        s = UserUpdateSerializer(
            self.user,
            data={"first_name": "Carlos", "last_name": "López"},
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Carlos")

    def test_valid_avatar_url_https(self):
        s = UserUpdateSerializer(
            self.user,
            data={"avatar": "https://cdn.example.com/avatar.png"},
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_invalid_avatar_url_no_scheme(self):
        s = UserUpdateSerializer(
            self.user,
            data={"avatar": "cdn.example.com/avatar.png"},
            partial=True,
        )
        self.assertFalse(s.is_valid())
        self.assertIn("avatar", s.errors)

    def test_first_name_too_short(self):
        s = UserUpdateSerializer(
            self.user,
            data={"first_name": "A"},
            partial=True,
        )
        self.assertFalse(s.is_valid())
        self.assertIn("first_name", s.errors)

    def test_last_name_too_short(self):
        s = UserUpdateSerializer(
            self.user,
            data={"last_name": "B"},
            partial=True,
        )
        self.assertFalse(s.is_valid())
        self.assertIn("last_name", s.errors)

    def test_first_name_stripped_of_whitespace(self):
        s = UserUpdateSerializer(
            self.user,
            data={"first_name": "  Lucía  "},
            partial=True,
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["first_name"], "Lucía")

    def test_latitude_accepts_none_and_rejects_out_of_range(self):
        self.assertIsNone(UserUpdateSerializer().validate_latitude(None))

        s = UserUpdateSerializer(
            self.user,
            data={"latitude": 91},
            partial=True,
        )
        self.assertFalse(s.is_valid())
        self.assertIn("latitude", s.errors)

    def test_longitude_accepts_none_and_rejects_out_of_range(self):
        self.assertIsNone(UserUpdateSerializer().validate_longitude(None))

        s = UserUpdateSerializer(
            self.user,
            data={"longitude": -181},
            partial=True,
        )
        self.assertFalse(s.is_valid())
        self.assertIn("longitude", s.errors)

    def test_postal_code_accepts_none_strips_and_rejects_too_long(self):
        serializer = UserUpdateSerializer()
        self.assertIsNone(serializer.validate_postal_code(None))
        self.assertEqual(serializer.validate_postal_code("  28013  "), "28013")

        s = UserUpdateSerializer(
            self.user,
            data={"postal_code": "1" * 21},
            partial=True,
        )
        self.assertFalse(s.is_valid())
        self.assertIn("postal_code", s.errors)


# ══════════════════════════════════════════════
#  USER RANKING SERIALIZER
# ══════════════════════════════════════════════

class UserRankingSerializerTests(TestCase):

    def test_contains_expected_fields(self):
        user = make_user()
        data = UserRankingSerializer(user).data
        for field in ["id", "name", "avatar", "rating", "completed_trades", "hours_given", "badge", "location"]:
            self.assertIn(field, data)

    def test_sensitive_fields_excluded(self):
        user = make_user()
        data = UserRankingSerializer(user).data
        self.assertNotIn("email", data)
        self.assertNotIn("credits", data)


# ══════════════════════════════════════════════
#  USER SKILL SERIALIZER
# ══════════════════════════════════════════════

class UserSkillSerializerTests(TestCase):

    def test_create_user_skill(self):
        user  = make_user()
        skill = make_skill("Carpintería")
        s = UserSkillSerializer(data={"skill_id": skill.id})
        self.assertTrue(s.is_valid(), s.errors)
        us = s.save(user=user)
        self.assertEqual(us.skill, skill)

    def test_skill_detail_exposed_on_read(self):
        user  = make_user()
        skill = make_skill("Pintura")
        us    = UserSkill.objects.create(user=user, skill=skill)
        data  = UserSkillSerializer(us).data
        self.assertEqual(data["skill"]["name"], "Pintura")


# ══════════════════════════════════════════════
#  ADMIN SERIALIZERS
# ══════════════════════════════════════════════

class AdminUserSerializerTests(TestCase):

    def test_all_admin_fields_present(self):
        user = make_user()
        data = AdminUserSerializer(user).data
        for field in ["is_staff", "is_active", "date_joined", "last_login"]:
            self.assertIn(field, data)

    def test_name_computed_field(self):
        user = make_user(first_name="Juan", last_name="Pérez")
        data = AdminUserSerializer(user).data
        self.assertEqual(data["name"], "Juan Pérez")


class AdminUserUpdateSerializerTests(TestCase):

    def test_negative_credits_rejected(self):
        user = make_user()
        s    = AdminUserUpdateSerializer(user, data={"credits": -5}, partial=True)
        self.assertFalse(s.is_valid())
        self.assertIn("credits", s.errors)

    def test_zero_credits_allowed(self):
        user = make_user()
        s    = AdminUserUpdateSerializer(user, data={"credits": 0}, partial=True)
        self.assertTrue(s.is_valid(), s.errors)

    def test_deactivate_user(self):
        user = make_user()
        s    = AdminUserUpdateSerializer(user, data={"is_active": False}, partial=True)
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        user.refresh_from_db()
        self.assertFalse(user.is_active)
