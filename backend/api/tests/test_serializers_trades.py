"""
test_serializers_trades.py – Tests de los serializers de intercambios (Trades).

Cubre:
  · TradeCreateSerializer    → validaciones, creación, restricciones de negocio
  · TradeStatusUpdateSerializer → transiciones válidas e inválidas
  · Transferencia de créditos al completar un trade
  · Creación de transacciones al completar
  · Actualización de badges tras completar trades
  · TradeSerializer (lectura)
"""

from django.test import TestCase, RequestFactory
from django.utils import timezone
from datetime import timedelta
import decimal

from api.models import Conversation, Message, Trade, Transaction, Service, User
from api.serializers import (
    TradeCreateSerializer,
    TradeNegotiationSerializer,
    TradeStatusUpdateSerializer,
    TradeSerializer,
    get_or_create_trade_conversation,
)
from .factories import (
    make_user, make_service, make_trade, make_completed_trade, make_conversation,
)


def _request(user):
    req = RequestFactory().post("/")
    req.user = user
    return req


# ══════════════════════════════════════════════
#  TRADE CREATE
# ══════════════════════════════════════════════

class TradeCreateSerializerTests(TestCase):

    def setUp(self):
        self.offerer   = make_user(username="offerer",   email="off@x.com",  credits=10)
        self.requester = make_user(username="requester", email="req@x.com",  credits=10)
        self.service   = make_service(self.offerer, credits=3)
        self.future    = timezone.now() + timedelta(days=2)

    def _data(self, **overrides):
        data = {
            "service_id":     self.service.id,
            "scheduled_date": self.future.isoformat(),
            "credits_amount": 3,
            "notes":          "Por favor, trae el material.",
        }
        data.update(overrides)
        return data

    def test_valid_trade_creation(self):
        s = TradeCreateSerializer(data=self._data(), context={"request": _request(self.requester)})
        self.assertTrue(s.is_valid(), s.errors)
        trade = s.save()
        self.assertEqual(trade.offerer,   self.offerer)
        self.assertEqual(trade.requester, self.requester)
        self.assertEqual(trade.status,    Trade.Status.PENDING)

    def test_cannot_request_own_service(self):
        s = TradeCreateSerializer(
            data=self._data(),
            context={"request": _request(self.offerer)},
        )
        self.assertFalse(s.is_valid())
        self.assertTrue(any("propio" in str(e).lower() for e in s.errors.values()))

    def test_credits_must_match_service(self):
        s = TradeCreateSerializer(
            data=self._data(credits_amount=99),
            context={"request": _request(self.requester)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("credits_amount", s.errors)

    def test_past_date_rejected(self):
        s = TradeCreateSerializer(
            data=self._data(scheduled_date=(timezone.now() - timedelta(hours=1)).isoformat()),
            context={"request": _request(self.requester)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("scheduled_date", s.errors)

    def test_insufficient_credits_rejected(self):
        poor_user = make_user(username="poor", email="poor@x.com", credits=1)
        service   = make_service(self.offerer, credits=5)
        s = TradeCreateSerializer(
            data={
                "service_id":     service.id,
                "scheduled_date": self.future.isoformat(),
                "credits_amount": 5,
            },
            context={"request": _request(poor_user)},
        )
        self.assertFalse(s.is_valid())

    def test_duplicate_active_trade_rejected(self):
        # Primer trade válido
        make_trade(self.offerer, self.requester, service=self.service, status=Trade.Status.PENDING)
        # Segundo trade para el mismo servicio
        s = TradeCreateSerializer(
            data=self._data(),
            context={"request": _request(self.requester)},
        )
        self.assertFalse(s.is_valid())

    def test_request_type_service_no_credit_check(self):
        """Para servicios de tipo 'request' no se verifica el saldo del requester."""
        req_service = make_service(
            self.offerer,
            service_type=Service.Type.REQUEST,
            credits=3,
        )
        poor_user = make_user(username="poor2", email="poor2@x.com", credits=0)
        s = TradeCreateSerializer(
            data={
                "service_id":     req_service.id,
                "scheduled_date": self.future.isoformat(),
                "credits_amount": 3,
            },
            context={"request": _request(poor_user)},
        )
        # No debe fallar por saldo insuficiente en servicios de tipo 'request'
        self.assertTrue(s.is_valid(), s.errors)

    def test_credits_amount_must_be_at_least_one(self):
        s = TradeCreateSerializer(
            data=self._data(credits_amount=0),
            context={"request": _request(self.requester)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("credits_amount", s.errors)

    def test_credits_amount_cannot_exceed_twenty(self):
        service = make_service(self.offerer, credits=20)
        s = TradeCreateSerializer(
            data=self._data(service_id=service.id, credits_amount=21),
            context={"request": _request(self.requester)},
        )
        self.assertFalse(s.is_valid())
        self.assertIn("credits_amount", s.errors)


# ══════════════════════════════════════════════
#  TRADE NEGOTIATION
# ══════════════════════════════════════════════

class TradeNegotiationSerializerTests(TestCase):

    def setUp(self):
        self.offerer = make_user(username="off_neg", email="off_neg@x.com", credits=10)
        self.requester = make_user(username="req_neg", email="req_neg@x.com", credits=10)
        self.service = make_service(self.offerer, credits=3)
        self.trade = make_trade(
            self.offerer,
            self.requester,
            service=self.service,
            status=Trade.Status.PENDING,
            credits_amount=3,
        )
        self.future = timezone.now() + timedelta(days=4)

    def _serializer(self, data, user=None, trade=None):
        return TradeNegotiationSerializer(
            data=data,
            context={
                "trade": trade or self.trade,
                "request": _request(user or self.offerer),
            },
        )

    def test_past_scheduled_date_rejected(self):
        s = self._serializer({"scheduled_date": timezone.now() - timedelta(hours=1)})
        self.assertFalse(s.is_valid())
        self.assertIn("scheduled_date", s.errors)

    def test_only_pending_trades_can_be_negotiated(self):
        self.trade.status = Trade.Status.ACCEPTED
        self.trade.save()

        s = self._serializer({"credits_amount": 4})

        self.assertFalse(s.is_valid())
        self.assertIn("non_field_errors", s.errors)

    def test_non_participant_cannot_negotiate(self):
        outsider = make_user(username="outsider", email="outsider@x.com")

        s = self._serializer({"credits_amount": 4}, user=outsider)

        self.assertFalse(s.is_valid())
        self.assertIn("non_field_errors", s.errors)

    def test_must_change_negotiable_field(self):
        s = self._serializer({"message": "Solo mensaje"})

        self.assertFalse(s.is_valid())
        self.assertIn("non_field_errors", s.errors)

    def test_offer_service_requires_requester_credit_balance(self):
        self.requester.credits = 2
        self.requester.save()

        s = self._serializer({"credits_amount": 5})

        self.assertFalse(s.is_valid())
        self.assertIn("non_field_errors", s.errors)

    def test_request_type_service_skips_requester_credit_balance_check(self):
        request_service = make_service(
            self.offerer,
            service_type=Service.Type.REQUEST,
            credits=3,
        )
        trade = make_trade(
            self.offerer,
            self.requester,
            service=request_service,
            status=Trade.Status.PENDING,
            credits_amount=3,
        )
        self.requester.credits = 0
        self.requester.save()

        s = self._serializer({"credits_amount": 5}, trade=trade)

        self.assertTrue(s.is_valid(), s.errors)

    def test_save_updates_trade_and_creates_trade_proposal_message(self):
        s = self._serializer(
            {
                "scheduled_date": self.future,
                "credits_amount": 4,
                "notes": "Nueva nota",
                "message": "Te propongo otro horario",
            },
            user=self.offerer,
        )
        self.assertTrue(s.is_valid(), s.errors)

        updated = s.save()

        updated.refresh_from_db()
        self.assertEqual(updated.credits_amount, 4)
        self.assertEqual(updated.notes, "Nueva nota")
        self.assertEqual(updated.last_proposed_by, self.offerer)
        msg = Message.objects.get(trade=updated, message_type=Message.Type.TRADE_PROPOSAL)
        self.assertEqual(msg.sender, self.offerer)
        self.assertEqual(msg.payload["action"], "negotiated")
        self.assertEqual(msg.payload["message"], "Te propongo otro horario")


class TradeConversationHelperTests(TestCase):

    def test_reuses_existing_conversation_with_same_participants(self):
        offerer = make_user(username="off_conv", email="off_conv@x.com")
        requester = make_user(username="req_conv", email="req_conv@x.com")
        trade = make_trade(offerer, requester)
        existing = make_conversation(requester, offerer)

        conversation = get_or_create_trade_conversation(trade)

        self.assertEqual(conversation, existing)
        self.assertEqual(Conversation.objects.count(), 1)


# ══════════════════════════════════════════════
#  TRADE STATUS UPDATE – TRANSICIONES
# ══════════════════════════════════════════════

class TradeStatusUpdateTransitionTests(TestCase):

    def setUp(self):
        self.offerer   = make_user(username="off_st",   email="off_st@x.com",  credits=20)
        self.requester = make_user(username="req_st",   email="req_st@x.com",  credits=20)

    def _update(self, trade, new_status):
        s = TradeStatusUpdateSerializer(trade, data={"status": new_status})
        return s

    # ── Transiciones válidas ─────────────────────

    def test_pending_to_accepted(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.PENDING)
        s = self._update(trade, "accepted")
        self.assertTrue(s.is_valid(), s.errors)

    def test_pending_to_cancelled(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.PENDING)
        s = self._update(trade, "cancelled")
        self.assertTrue(s.is_valid(), s.errors)

    def test_accepted_to_in_progress(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.ACCEPTED)
        s = self._update(trade, "in_progress")
        self.assertTrue(s.is_valid(), s.errors)

    def test_in_progress_to_completed(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.IN_PROGRESS)
        s = self._update(trade, "completed")
        self.assertTrue(s.is_valid(), s.errors)

    def test_in_progress_to_cancelled(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.IN_PROGRESS)
        s = self._update(trade, "cancelled")
        self.assertTrue(s.is_valid(), s.errors)

    # ── Transiciones inválidas ───────────────────

    def test_completed_to_anything_rejected(self):
        trade = make_completed_trade(self.offerer, self.requester)
        for target in ["pending", "accepted", "in_progress", "cancelled"]:
            s = self._update(trade, target)
            self.assertFalse(s.is_valid(), f"Debería rechazar completed → {target}")

    def test_cancelled_to_anything_rejected(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.CANCELLED)
        for target in ["pending", "accepted", "in_progress", "completed"]:
            s = self._update(trade, target)
            self.assertFalse(s.is_valid(), f"Debería rechazar cancelled → {target}")

    def test_pending_to_completed_rejected(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.PENDING)
        s = self._update(trade, "completed")
        self.assertFalse(s.is_valid())

    def test_pending_to_in_progress_rejected(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.PENDING)
        s = self._update(trade, "in_progress")
        self.assertFalse(s.is_valid())

    def test_user_cannot_accept_own_proposal(self):
        trade = make_trade(self.offerer, self.requester, status=Trade.Status.PENDING)
        trade.last_proposed_by = self.offerer
        trade.save()
        s = TradeStatusUpdateSerializer(
            trade,
            data={"status": Trade.Status.ACCEPTED},
            context={"request": _request(self.offerer)},
        )

        self.assertFalse(s.is_valid())
        self.assertIn("status", s.errors)


# ══════════════════════════════════════════════
#  TRANSFERENCIA DE CRÉDITOS AL COMPLETAR
# ══════════════════════════════════════════════

class CreditTransferOnCompleteTests(TestCase):

    def _complete_trade(self, offerer_credits=20, requester_credits=20, credits_amount=5):
        offerer   = make_user(username="off_tr",  email="off_tr@x.com",  credits=offerer_credits)
        requester = make_user(username="req_tr",  email="req_tr@x.com",  credits=requester_credits)
        service   = make_service(offerer, credits=credits_amount, duration=60)
        trade     = make_trade(
            offerer, requester, service=service,
            status=Trade.Status.IN_PROGRESS, credits_amount=credits_amount,
        )
        s = TradeStatusUpdateSerializer(trade, data={"status": "completed"})
        self.assertTrue(s.is_valid(), s.errors)
        s.save()
        offerer.refresh_from_db()
        requester.refresh_from_db()
        trade.refresh_from_db()
        return trade, offerer, requester

    def test_requester_credits_decrease(self):
        trade, offerer, requester = self._complete_trade(requester_credits=20, credits_amount=5)
        self.assertEqual(requester.credits, 15)

    def test_offerer_credits_increase(self):
        trade, offerer, requester = self._complete_trade(offerer_credits=10, credits_amount=5)
        self.assertEqual(offerer.credits, decimal.Decimal('16.0'))

    def test_completed_at_is_set(self):
        trade, *_ = self._complete_trade()
        self.assertIsNotNone(trade.completed_at)

    def test_transactions_created(self):
        trade, *_ = self._complete_trade()
        txs = Transaction.objects.filter(trade=trade)
        self.assertEqual(txs.count(), 3)

    def test_debit_transaction_negative(self):
        trade, _, requester = self._complete_trade(credits_amount=3)
        debit = Transaction.objects.get(trade=trade, transaction_type=Transaction.Type.DEBIT)
        self.assertEqual(debit.amount, -3)
        self.assertEqual(debit.user, requester)

    def test_credit_transaction_positive(self):
        trade, offerer, _ = self._complete_trade(credits_amount=3)
        credit = Transaction.objects.get(trade=trade, transaction_type=Transaction.Type.CREDIT)
        self.assertEqual(credit.amount, 3)
        self.assertEqual(credit.user, offerer)

    def test_completed_trades_counter_incremented(self):
        trade, offerer, requester = self._complete_trade()
        self.assertEqual(offerer.completed_trades,   1)
        self.assertEqual(requester.completed_trades, 1)

    def test_hours_given_and_received_updated(self):
        trade, offerer, requester = self._complete_trade()
        # Servicio de 60 minutos → 1 hora
        self.assertEqual(requester.hours_given,    1)
        self.assertEqual(offerer.hours_received,   1)

    def test_badge_assigned_after_threshold(self):
        """Al alcanzar 5 trades completados se asigna la insignia Bronze."""
        offerer   = make_user(username="off_badge",  email="off_badge@x.com",  credits=100)
        requester = make_user(username="req_badge",  email="req_badge@x.com",  credits=100)
        requester.completed_trades = 4
        requester.save()

        service = make_service(offerer, credits=2, duration=60)
        trade   = make_trade(
            offerer, requester, service=service,
            status=Trade.Status.IN_PROGRESS, credits_amount=2,
        )
        s = TradeStatusUpdateSerializer(trade, data={"status": "completed"})
        s.is_valid()
        s.save()
        requester.refresh_from_db()
        self.assertEqual(requester.badge, User.Badge.BRONZE)

    def test_atomicity_on_error(self):
        """Si algo falla, no debe quedar a medias la transferencia."""
        # Este test es de humo: verifica que la anotación @transaction.atomic
        # existe indirectamente comprobando que los créditos no cambian ante errores.
        offerer   = make_user(username="off_atom", email="off_atom@x.com", credits=10)
        requester = make_user(username="req_atom", email="req_atom@x.com", credits=10)
        before_off = offerer.credits
        before_req = requester.credits

        # Intentar una transición inválida no debe mover créditos
        trade = make_trade(offerer, requester, status=Trade.Status.PENDING)
        s = TradeStatusUpdateSerializer(trade, data={"status": "completed"})
        self.assertFalse(s.is_valid())

        offerer.refresh_from_db()
        requester.refresh_from_db()
        self.assertEqual(offerer.credits,   before_off)
        self.assertEqual(requester.credits, before_req)


# ══════════════════════════════════════════════
#  TRADE SERIALIZER (lectura)
# ══════════════════════════════════════════════

class TradeReadSerializerTests(TestCase):

    def test_nested_objects_present(self):
        offerer   = make_user(username="off_read", email="off_read@x.com")
        requester = make_user(username="req_read", email="req_read@x.com")
        trade     = make_trade(offerer, requester)
        data      = TradeSerializer(trade).data
        self.assertIsInstance(data["service"],   dict)
        self.assertIsInstance(data["offerer"],   dict)
        self.assertIsInstance(data["requester"], dict)
        self.assertIsInstance(data["reviews"],   list)

    def test_reviews_empty_on_new_trade(self):
        offerer   = make_user(username="off_rv", email="off_rv@x.com")
        requester = make_user(username="req_rv", email="req_rv@x.com")
        trade     = make_trade(offerer, requester)
        data      = TradeSerializer(trade).data
        self.assertEqual(data["reviews"], [])

    def test_completed_at_null_before_completion(self):
        offerer   = make_user(username="off_ca", email="off_ca@x.com")
        requester = make_user(username="req_ca", email="req_ca@x.com")
        trade     = make_trade(offerer, requester)
        data      = TradeSerializer(trade).data
        self.assertIsNone(data["completed_at"])
