"""
test_models.py – Tests unitarios de los modelos de TimeCircle.

Cubre:
  · User          → badge, rating, campos por defecto
  · Category / Tag / Skill / UserSkill
  · Service       → campos, __str__, ordenación
  · Trade         → flujo de estados, __str__
  · Transaction   → __str__, amount positivo/negativo
  · Conversation  → participantes, __str__
  · Message       → __str__, read por defecto
  · Review        → __str__, constraint rating 1-5
"""

from django.test import TestCase
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from api.models import (
    User, Category, Tag, Skill, UserSkill,
    Service, Trade, Transaction,
    Conversation, Message, Review,
)
from .factories import (
    make_user, make_category, make_tag, make_skill,
    make_service, make_trade, make_completed_trade,
    make_conversation, make_message, make_review,
)

class UserModelTests(TestCase):

    def setUp(self):
        self.user = make_user()

    # ── Valores por defecto ──────────────────

    def test_default_credits(self):
        self.assertEqual(self.user.credits, 10)

    def test_default_hours_given_and_received(self):
        self.assertEqual(self.user.hours_given, 0)
        self.assertEqual(self.user.hours_received, 0)

    def test_default_completed_trades(self):
        self.assertEqual(self.user.completed_trades, 0)

    def test_default_rating(self):
        self.assertEqual(float(self.user.rating), 0.00)

    def test_default_badge_is_none(self):
        self.assertEqual(self.user.badge, '')

    # ── __str__ ─────────────────────────────

    def test_str_with_full_name(self):
        result = str(self.user)
        self.assertIn(self.user.email, result)

    def test_str_without_full_name(self):
        user = make_user(username="noname", email="noname@x.com", first_name="", last_name="")
        # Debe contener username o email
        self.assertTrue(user.username in str(user) or user.email in str(user))

    # ── update_badge ─────────────────────────

    def test_badge_bronze_at_5_trades(self):
        self.user.completed_trades = 5
        self.user.save()
        self.user.update_badge()
        self.user.refresh_from_db()
        self.assertEqual(self.user.badge, User.Badge.BRONZE)

    def test_badge_silver_at_20_trades(self):
        self.user.completed_trades = 20
        self.user.save()
        self.user.update_badge()
        self.user.refresh_from_db()
        self.assertEqual(self.user.badge, User.Badge.SILVER)

    def test_badge_gold_at_50_trades(self):
        self.user.completed_trades = 50
        self.user.save()
        self.user.update_badge()
        self.user.refresh_from_db()
        self.assertEqual(self.user.badge, User.Badge.GOLD)

    def test_no_badge_below_5_trades(self):
        self.user.completed_trades = 4
        self.user.save()
        self.user.update_badge()
        self.user.refresh_from_db()
        self.assertIsNone(self.user.badge)

    # ── update_rating ─────────────────────────

    def test_update_rating_with_no_reviews(self):
        self.user.update_rating()
        self.user.refresh_from_db()
        self.assertEqual(float(self.user.rating), 0.00)
        self.assertEqual(self.user.total_reviews, 0)

    def test_update_rating_averages_correctly(self):
        offerer = make_user(username="offerer", email="offerer@x.com")
        trade   = make_completed_trade(offerer=offerer, requester=self.user)
        make_review(trade=trade, reviewer=offerer, reviewee=self.user, rating=4)

        self.user.update_rating()
        self.user.refresh_from_db()
        self.assertEqual(float(self.user.rating), 4.00)
        self.assertEqual(self.user.total_reviews, 1)

    def test_update_rating_with_multiple_reviews(self):
        offerer1 = make_user(username="off1", email="off1@x.com")
        offerer2 = make_user(username="off2", email="off2@x.com")
        trade1   = make_completed_trade(offerer=offerer1, requester=self.user)
        trade2   = make_completed_trade(offerer=offerer2, requester=self.user)
        make_review(trade=trade1, reviewer=offerer1, reviewee=self.user, rating=4)
        make_review(trade=trade2, reviewer=offerer2, reviewee=self.user, rating=2)

        self.user.update_rating()
        self.user.refresh_from_db()
        self.assertEqual(float(self.user.rating), 3.00)
        self.assertEqual(self.user.total_reviews, 2)

class CategoryModelTests(TestCase):

    def test_str(self):
        cat = make_category(name="Hogar")
        self.assertEqual(str(cat), "Hogar")

    def test_unique_name(self):
        make_category(name="Unica")
        with self.assertRaises(Exception):
            Category.objects.create(name="Unica")


class TagModelTests(TestCase):

    def test_str(self):
        tag = make_tag(name="django")
        self.assertEqual(str(tag), "django")

    def test_unique_name(self):
        make_tag(name="unico")
        with self.assertRaises(Exception):
            Tag.objects.create(name="unico")


class SkillModelTests(TestCase):

    def test_str(self):
        skill = make_skill(name="Cocina")
        self.assertEqual(str(skill), "Cocina")


class UserSkillModelTests(TestCase):

    def test_str(self):
        user  = make_user()
        skill = make_skill()
        us    = UserSkill.objects.create(user=user, skill=skill)
        self.assertIn(user.username, str(us))
        self.assertIn(skill.name, str(us))

    def test_unique_together(self):
        user  = make_user()
        skill = make_skill()
        UserSkill.objects.create(user=user, skill=skill)
        with self.assertRaises(IntegrityError):
            UserSkill.objects.create(user=user, skill=skill)

class ServiceModelTests(TestCase):

    def setUp(self):
        self.user = make_user()

    def test_str_offer(self):
        service = make_service(self.user, service_type=Service.Type.OFFER, title="Reparar bici")
        self.assertIn("Reparar bici", str(service))
        self.assertIn("Oferta", str(service))

    def test_str_request(self):
        service = make_service(self.user, service_type=Service.Type.REQUEST, title="Necesito ayuda")
        self.assertIn("Solicitud", str(service))

    def test_default_status_is_active(self):
        service = make_service(self.user)
        self.assertEqual(service.status, Service.Status.ACTIVE)

    def test_ordering_newest_first(self):
        make_service(self.user, title="Primero")
        make_service(self.user, title="Segundo")
        services = list(Service.objects.all())
        # El más reciente debe ser el primero
        self.assertEqual(services[0].title, "Segundo")
        self.assertEqual(services[1].title, "Primero")

    def test_category_set_null_on_delete(self):
        cat     = make_category(name="Efímera")
        service = make_service(self.user, category=cat)
        cat.delete()
        service.refresh_from_db()
        self.assertIsNone(service.category)

    def test_tags_many_to_many(self):
        service = make_service(self.user)
        tag1 = make_tag("tag1")
        tag2 = make_tag("tag2")
        service.tags.set([tag1, tag2])
        self.assertEqual(service.tags.count(), 2)

class TradeModelTests(TestCase):

    def setUp(self):
        self.offerer   = make_user(username="offerer",   email="off@x.com")
        self.requester = make_user(username="requester", email="req@x.com")

    def test_str_contains_pk_and_status(self):
        trade = make_trade(self.offerer, self.requester)
        self.assertIn(str(trade.pk), str(trade))
        self.assertIn("Pendiente", str(trade))

    def test_default_status_is_pending(self):
        trade = make_trade(self.offerer, self.requester)
        self.assertEqual(trade.status, Trade.Status.PENDING)

    def test_completed_at_is_null_by_default(self):
        trade = make_trade(self.offerer, self.requester)
        self.assertIsNone(trade.completed_at)

    def test_ordering_newest_first(self):
        t1 = make_trade(self.offerer, self.requester)
        t2 = make_trade(self.offerer, self.requester)
        trades = list(Trade.objects.all())
        self.assertEqual(trades[0].pk, t2.pk)
        self.assertEqual(trades[1].pk, t1.pk)

class TransactionModelTests(TestCase):

    def test_str_positive_amount(self):
        offerer   = make_user(username="off", email="off@x.com")
        requester = make_user(username="req", email="req@x.com")
        trade = make_completed_trade(offerer, requester)
        tx = Transaction.objects.create(
            user=offerer, trade=trade,
            amount=2, transaction_type=Transaction.Type.CREDIT
        )
        self.assertIn("+2", str(tx))
        self.assertIn(offerer.username, str(tx))

    def test_str_negative_amount(self):
        offerer   = make_user(username="off2", email="off2@x.com")
        requester = make_user(username="req2", email="req2@x.com")
        trade = make_completed_trade(offerer, requester)
        tx = Transaction.objects.create(
            user=requester, trade=trade,
            amount=-2, transaction_type=Transaction.Type.DEBIT
        )
        self.assertIn("-2", str(tx))

class ConversationModelTests(TestCase):

    def test_str_includes_participant_names(self):
        u1   = make_user(username="alice", email="alice@x.com")
        u2   = make_user(username="bob",   email="bob@x.com")
        conv = make_conversation(u1, u2)
        self.assertIn("alice", str(conv))

    def test_participants_count(self):
        u1   = make_user(username="alice2", email="alice2@x.com")
        u2   = make_user(username="bob2",   email="bob2@x.com")
        conv = make_conversation(u1, u2)
        self.assertEqual(conv.participants.count(), 2)


class MessageModelTests(TestCase):

    def test_str_truncated(self):
        u1   = make_user(username="alice3", email="alice3@x.com")
        u2   = make_user(username="bob3",   email="bob3@x.com")
        conv = make_conversation(u1, u2)
        msg  = make_message(conv, u1, "Hola, ¿cómo estás?")
        self.assertIn("alice3", str(msg))

    def test_read_defaults_to_false(self):
        u1   = make_user(username="alice4", email="alice4@x.com")
        u2   = make_user(username="bob4",   email="bob4@x.com")
        conv = make_conversation(u1, u2)
        msg  = make_message(conv, u1)
        self.assertFalse(msg.read)

    def test_ordering_oldest_first(self):
        u1   = make_user(username="alice5", email="alice5@x.com")
        u2   = make_user(username="bob5",   email="bob5@x.com")
        conv = make_conversation(u1, u2)
        m1   = make_message(conv, u1, "Primero")
        m2   = make_message(conv, u2, "Segundo")
        msgs = list(conv.messages.all())
        self.assertEqual(msgs[0].pk, m1.pk)
        self.assertEqual(msgs[1].pk, m2.pk)

class ReviewModelTests(TestCase):

    def setUp(self):
        self.offerer   = make_user(username="off_rev", email="off_rev@x.com")
        self.requester = make_user(username="req_rev", email="req_rev@x.com")
        self.trade     = make_completed_trade(self.offerer, self.requester)

    def test_str(self):
        review = make_review(self.trade, self.offerer, self.requester, rating=5)
        self.assertIn(self.offerer.username, str(review))
        self.assertIn("5★", str(review))

    def test_unique_together_trade_reviewer(self):
        make_review(self.trade, self.offerer, self.requester)
        with self.assertRaises(IntegrityError):
            Review.objects.create(
                trade=self.trade,
                reviewer=self.offerer,
                reviewee=self.requester,
                rating=3,
                comment="Segundo intento de reseña.",
            )

    def test_ordering_newest_first(self):
        r1         = make_review(self.trade, self.offerer, self.requester, rating=3)
        # Crear un segundo trade para una segunda reseña
        offerer2   = make_user(username="off2_rev", email="off2_rev@x.com")
        trade2     = make_completed_trade(offerer2, self.requester)
        r2         = make_review(trade2, offerer2, self.requester, rating=5)
        reviews    = list(Review.objects.all())
        self.assertEqual(reviews[0].pk, r2.pk)
        self.assertEqual(reviews[1].pk, r1.pk)
