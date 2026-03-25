"""
test_serializers_reviews.py – Tests de ReviewCreateSerializer y ReviewSerializer.

Cubre:
  · Validación de rating (1–5)
  · Validación de comentario (mínimo 10 caracteres)
  · Solo participantes del trade pueden valorar
  · El reviewee debe haber participado en el trade
  · No puede valorarse a uno mismo
  · Solo una valoración por trade por usuario
  · Solo se puede valorar trades completados
  · Tras crear la reseña, se recalcula el rating del reviewee
  · ReviewSerializer (lectura)
"""

from django.test import TestCase, RequestFactory

from api.models import Review, User
from api.serializers import ReviewCreateSerializer, ReviewSerializer
from .factories import (
    make_user, make_completed_trade, make_review,
)


def _request(user):
    req = RequestFactory().post("/")
    req.user = user
    return req


# ══════════════════════════════════════════════
#  REVIEW CREATE
# ══════════════════════════════════════════════

class ReviewCreateSerializerTests(TestCase):

    def setUp(self):
        self.offerer   = make_user(username="off_rv",  email="off_rv@x.com")
        self.requester = make_user(username="req_rv",  email="req_rv@x.com")
        self.trade     = make_completed_trade(self.offerer, self.requester)

    def _data(self, **overrides):
        data = {
            "trade_id":    self.trade.id,
            "reviewee_id": self.requester.id,
            "rating":      5,
            "comment":     "Excelente persona y muy puntual.",
        }
        data.update(overrides)
        return data

    # ── Creación válida ──────────────────────────

    def test_valid_review_created(self):
        s = ReviewCreateSerializer(
            data=self._data(),
            context={"request": _request(self.offerer)},
        )
        self.assertTrue(s.is_valid(), s.errors)
        review = s.save()
        self.assertIsInstance(review, Review)
        self.assertEqual(review.reviewer, self.offerer)
        self.assertEqual(review.reviewee, self.requester)

    def test_requester_can_review_offerer(self):
        """El requester también puede dejar reseña al offerer."""
        s = ReviewCreateSerializer(
            data={
                "trade_id":    self.trade.id,
                "reviewee_id": self.offerer.id,
                "rating":      4,
                "comment":     "Muy buen servicio prestado.",
            },
            context={"request": _request(self.requester)},
        )
        self.assertTrue(s.is_valid(), s.errors)

    # ── Validaciones de rating ───────────────────

    def test_rating_below_1_rejected(self):
        s = ReviewCreateSerializer(
            data=self._data(rating=0),
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("rating", s.errors)

    def test_rating_above_5_rejected(self):
        s = ReviewCreateSerializer(
            data=self._data(rating=6),
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("rating", s.errors)

    def test_rating_boundary_1_ok(self):
        s = ReviewCreateSerializer(
            data=self._data(rating=1),
            context={"request": _request(self.offerer)},
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_rating_boundary_5_ok(self):
        s = ReviewCreateSerializer(
            data=self._data(rating=5),
            context={"request": _request(self.offerer)},
        )
        self.assertTrue(s.is_valid(), s.errors)

    # ── Validaciones de comentario ───────────────

    def test_comment_too_short(self):
        s = ReviewCreateSerializer(
            data=self._data(comment="Corto"),
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("comment", s.errors)

    def test_comment_exactly_10_chars_ok(self):
        s = ReviewCreateSerializer(
            data=self._data(comment="Muy bueno!"),
            context={"request": _request(self.offerer)},
        )
        self.assertTrue(s.is_valid(), s.errors)

    def test_comment_stripped(self):
        s = ReviewCreateSerializer(
            data=self._data(comment="  Muy buen servicio!  "),
            context={"request": _request(self.offerer)},
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["comment"], "Muy buen servicio!")

    # ── Validaciones de pertenencia al trade ────

    def test_outsider_cannot_review(self):
        outsider = make_user(username="outsider", email="out@x.com")
        s = ReviewCreateSerializer(
            data=self._data(),
            context={"request": _request(outsider)},
        )
        self.assertFalse(s.is_valid())

    def test_reviewee_must_be_participant(self):
        outsider = make_user(username="stranger", email="str@x.com")
        s = ReviewCreateSerializer(
            data=self._data(reviewee_id=outsider.id),
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())

    def test_cannot_review_self(self):
        s = ReviewCreateSerializer(
            data=self._data(reviewee_id=self.offerer.id),  # reviewee = reviewer
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())

    def test_duplicate_review_rejected(self):
        make_review(self.trade, self.offerer, self.requester)
        s = ReviewCreateSerializer(
            data=self._data(),
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())

    def test_cannot_review_non_completed_trade(self):
        from .factories import make_trade
        from api.models import Trade
        pending_trade = make_trade(
            self.offerer, self.requester, status=Trade.Status.PENDING
        )
        s = ReviewCreateSerializer(
            data={
                "trade_id":    pending_trade.id,
                "reviewee_id": self.requester.id,
                "rating":      5,
                "comment":     "Todavía no ha terminado.",
            },
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("trade_id", s.errors)

    # ── Efectos secundarios ──────────────────────

    def test_reviewee_rating_updated_after_review(self):
        s = ReviewCreateSerializer(
            data=self._data(rating=4),
            context={"request": _request(self.offerer)},
        )
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        self.requester.refresh_from_db()
        self.assertEqual(float(self.requester.rating), 4.00)
        self.assertEqual(self.requester.total_reviews, 1)

    def test_reviewee_rating_averages_multiple_reviews(self):
        """Si ya tiene una reseña, el rating debe promediar."""
        offerer2 = make_user(username="off2_rta", email="off2_rta@x.com")
        trade2   = make_completed_trade(offerer2, self.requester)
        # Primera reseña
        make_review(trade2, offerer2, self.requester, rating=2)
        self.requester.update_rating()

        # Segunda reseña
        s = ReviewCreateSerializer(
            data=self._data(rating=4),
            context={"request": _request(self.offerer)},
        )
        s.is_valid()
        s.save()

        self.requester.refresh_from_db()
        self.assertEqual(float(self.requester.rating), 3.00)
        self.assertEqual(self.requester.total_reviews, 2)


# ══════════════════════════════════════════════
#  REVIEW SERIALIZER (lectura)
# ══════════════════════════════════════════════

class ReviewReadSerializerTests(TestCase):

    def test_fields_present(self):
        offerer   = make_user(username="off_rr",  email="off_rr@x.com")
        requester = make_user(username="req_rr",  email="req_rr@x.com")
        trade     = make_completed_trade(offerer, requester)
        review    = make_review(trade, offerer, requester, rating=5)
        data      = ReviewSerializer(review).data

        for field in ["id", "trade", "reviewer", "reviewee", "rating", "comment", "created_at"]:
            self.assertIn(field, data)

    def test_reviewer_is_nested_object(self):
        offerer   = make_user(username="off_rrn", email="off_rrn@x.com")
        requester = make_user(username="req_rrn", email="req_rrn@x.com")
        trade     = make_completed_trade(offerer, requester)
        review    = make_review(trade, offerer, requester)
        data      = ReviewSerializer(review).data
        self.assertIsInstance(data["reviewer"], dict)
        self.assertEqual(data["reviewer"]["username"], offerer.username)

    def test_reviewee_is_nested_object(self):
        offerer   = make_user(username="off_rre", email="off_rre@x.com")
        requester = make_user(username="req_rre", email="req_rre@x.com")
        trade     = make_completed_trade(offerer, requester)
        review    = make_review(trade, offerer, requester)
        data      = ReviewSerializer(review).data
        self.assertIsInstance(data["reviewee"], dict)
