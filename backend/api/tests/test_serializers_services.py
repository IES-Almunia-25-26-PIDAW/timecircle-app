"""
test_serializers_services.py – Tests del ServiceSerializer.

Cubre:
  · Creación de oferta y solicitud con tags
  · Validaciones de duración (min 15 min, max 480 min)
  · Validaciones de créditos (min 1, max 20)
  · Validación de título (mínimo 5 caracteres)
  · Actualización parcial (PATCH) con y sin cambio de tags
  · Campos de solo lectura (user, created_at)
"""

from django.test import TestCase, RequestFactory

from api.models import Service, Category
from api.serializers import ServiceSerializer
from .factories import make_user, make_category, make_tag, make_service


def _request_with_user(user):
    req = RequestFactory().post("/")
    req.user = user
    return req


# ══════════════════════════════════════════════
#  CREACIÓN
# ══════════════════════════════════════════════

class ServiceCreateTests(TestCase):

    def setUp(self):
        self.user     = make_user()
        self.category = make_category()
        self.request  = _request_with_user(self.user)

    def _base_data(self, **overrides):
        data = {
            "type":        "offer",
            "title":       "Clases de guitarra",
            "description": "Enseño guitarra acústica y eléctrica.",
            "category_id": self.category.id,
            "duration":    60,
            "credits":     3,
        }
        data.update(overrides)
        return data

    def test_create_valid_offer(self):
        s = ServiceSerializer(data=self._base_data(), context={"request": self.request})
        self.assertTrue(s.is_valid(), s.errors)
        service = s.save(user=self.user)
        self.assertEqual(service.title, "Clases de guitarra")
        self.assertEqual(service.user, self.user)

    def test_create_with_tags(self):
        tag1 = make_tag("música")
        tag2 = make_tag("guitarra")
        data = self._base_data(tag_ids=[tag1.id, tag2.id])
        s = ServiceSerializer(data=data, context={"request": self.request})
        self.assertTrue(s.is_valid(), s.errors)
        service = s.save(user=self.user)
        self.assertEqual(service.tags.count(), 2)

    def test_default_status_active(self):
        s = ServiceSerializer(data=self._base_data(), context={"request": self.request})
        s.is_valid()
        service = s.save(user=self.user)
        self.assertEqual(service.status, Service.Status.ACTIVE)

    def test_create_request_type(self):
        s = ServiceSerializer(
            data=self._base_data(type="request", title="Necesito ayuda"),
            context={"request": self.request},
        )
        self.assertTrue(s.is_valid(), s.errors)
        service = s.save(user=self.user)
        self.assertEqual(service.type, Service.Type.REQUEST)


# ══════════════════════════════════════════════
#  VALIDACIONES
# ══════════════════════════════════════════════

class ServiceValidationTests(TestCase):

    def setUp(self):
        self.user     = make_user()
        self.category = make_category()
        self.request  = _request_with_user(self.user)

    def _s(self, **kwargs):
        data = {
            "type":        "offer",
            "title":       "Servicio válido",
            "category_id": self.category.id,
            "duration":    60,
            "credits":     2,
        }
        data.update(kwargs)
        return ServiceSerializer(data=data, context={"request": self.request})

    # ── Duración ────────────────────────────────

    def test_duration_minimum_15(self):
        s = self._s(duration=14)
        self.assertFalse(s.is_valid())
        self.assertIn("duration", s.errors)

    def test_duration_exactly_15_ok(self):
        s = self._s(duration=15)
        self.assertTrue(s.is_valid(), s.errors)

    def test_duration_maximum_480(self):
        s = self._s(duration=481)
        self.assertFalse(s.is_valid())
        self.assertIn("duration", s.errors)

    def test_duration_exactly_480_ok(self):
        s = self._s(duration=480)
        self.assertTrue(s.is_valid(), s.errors)

    # ── Créditos ────────────────────────────────

    def test_credits_minimum_1(self):
        s = self._s(credits=0)
        self.assertFalse(s.is_valid())
        self.assertIn("credits", s.errors)

    def test_credits_maximum_20(self):
        s = self._s(credits=21)
        self.assertFalse(s.is_valid())
        self.assertIn("credits", s.errors)

    def test_credits_exactly_20_ok(self):
        s = self._s(credits=20)
        self.assertTrue(s.is_valid(), s.errors)

    # ── Título ──────────────────────────────────

    def test_title_too_short(self):
        s = self._s(title="Hi")
        self.assertFalse(s.is_valid())
        self.assertIn("title", s.errors)

    def test_title_exactly_5_chars_ok(self):
        s = self._s(title="Clases")
        self.assertTrue(s.is_valid(), s.errors)

    def test_title_stripped(self):
        s = self._s(title="  Cocina  ")
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["title"], "Cocina")

    # ── Campos requeridos ────────────────────────

    def test_missing_category_fails(self):
        data = {
            "type": "offer", "title": "Servicio sin cat",
            "duration": 60, "credits": 2,
        }
        s = ServiceSerializer(data=data, context={"request": self.request})
        self.assertFalse(s.is_valid())
        self.assertIn("category_id", s.errors)


# ══════════════════════════════════════════════
#  ACTUALIZACIÓN (UPDATE / PATCH)
# ══════════════════════════════════════════════

class ServiceUpdateTests(TestCase):

    def setUp(self):
        self.user    = make_user()
        self.service = make_service(self.user)
        self.request = _request_with_user(self.user)

    def test_partial_update_title(self):
        s = ServiceSerializer(
            self.service,
            data={"title": "Nuevo título válido"},
            partial=True,
            context={"request": self.request},
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        self.assertEqual(updated.title, "Nuevo título válido")

    def test_update_replaces_tags(self):
        tag1 = make_tag("viejo")
        self.service.tags.set([tag1])

        tag2 = make_tag("nuevo")
        s = ServiceSerializer(
            self.service,
            data={"tag_ids": [tag2.id]},
            partial=True,
            context={"request": self.request},
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        tag_names = list(updated.tags.values_list("name", flat=True))
        self.assertNotIn("viejo", tag_names)
        self.assertIn("nuevo", tag_names)

    def test_update_without_tag_ids_preserves_tags(self):
        tag = make_tag("conservar")
        self.service.tags.set([tag])

        s = ServiceSerializer(
            self.service,
            data={"title": "Otro título largo"},
            partial=True,
            context={"request": self.request},
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        # Tags no deben haberse borrado
        self.assertIn("conservar", list(updated.tags.values_list("name", flat=True)))

    def test_pause_service(self):
        s = ServiceSerializer(
            self.service,
            data={"status": "paused"},
            partial=True,
            context={"request": self.request},
        )
        self.assertTrue(s.is_valid(), s.errors)
        updated = s.save()
        self.assertEqual(updated.status, Service.Status.PAUSED)


# ══════════════════════════════════════════════
#  REPRESENTACIÓN DE LECTURA
# ══════════════════════════════════════════════

class ServiceReadRepresentationTests(TestCase):

    def test_user_is_nested_object(self):
        user    = make_user()
        service = make_service(user)
        data    = ServiceSerializer(service).data
        self.assertIsInstance(data["user"], dict)
        self.assertEqual(data["user"]["username"], user.username)

    def test_category_is_nested_object(self):
        user    = make_user()
        service = make_service(user)
        data    = ServiceSerializer(service).data
        self.assertIsInstance(data["category"], dict)

    def test_tags_is_list_of_dicts(self):
        user    = make_user()
        service = make_service(user)
        tag     = make_tag("test-tag")
        service.tags.add(tag)
        data = ServiceSerializer(service).data
        self.assertIsInstance(data["tags"], list)
        self.assertEqual(data["tags"][0]["name"], "test-tag")

    def test_write_only_fields_excluded_from_output(self):
        user    = make_user()
        service = make_service(user)
        data    = ServiceSerializer(service).data
        self.assertNotIn("category_id", data)
        self.assertNotIn("tag_ids", data)
