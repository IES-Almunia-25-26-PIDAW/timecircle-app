"""
test_serializers_transactions.py – Tests del TransactionSerializer.

Cubre:
  · Representación de una transacción de crédito (positiva)
  · Representación de una transacción de débito (negativa)
  · Campos derivados: trade_id, service_name
  · La creación de transacciones solo ocurre vía la lógica de Trade (no directamente)
"""

from django.test import TestCase

from api.models import Transaction
from api.serializers import TransactionSerializer
from .factories import (
    make_user, make_completed_trade, make_service, make_trade,
)
from api.models import Trade


class TransactionSerializerTests(TestCase):

    def setUp(self):
        self.offerer   = make_user(username="off_tx",  email="off_tx@x.com",  credits=20)
        self.requester = make_user(username="req_tx",  email="req_tx@x.com",  credits=20)
        self.trade     = make_completed_trade(self.offerer, self.requester, credits_amount=4)

    def _get_tx(self, tx_type):
        return Transaction.objects.get(trade=self.trade, transaction_type=tx_type)

    # ── Campos básicos ───────────────────────────

    def test_credit_transaction_amount_positive(self):
        tx   = self._get_tx(Transaction.Type.CREDIT)
        data = TransactionSerializer(tx).data
        self.assertGreater(data["amount"], 0)

    def test_debit_transaction_amount_negative(self):
        tx   = self._get_tx(Transaction.Type.DEBIT)
        data = TransactionSerializer(tx).data
        self.assertLess(data["amount"], 0)

    def test_trade_id_field(self):
        tx   = self._get_tx(Transaction.Type.CREDIT)
        data = TransactionSerializer(tx).data
        self.assertEqual(data["trade_id"], self.trade.id)

    def test_service_name_field(self):
        tx   = self._get_tx(Transaction.Type.CREDIT)
        data = TransactionSerializer(tx).data
        self.assertEqual(data["service_name"], self.trade.service.title)

    def test_transaction_type_field(self):
        tx_credit = self._get_tx(Transaction.Type.CREDIT)
        tx_debit  = self._get_tx(Transaction.Type.DEBIT)
        self.assertEqual(TransactionSerializer(tx_credit).data["transaction_type"], "credit")
        self.assertEqual(TransactionSerializer(tx_debit).data["transaction_type"],  "debit")

    def test_all_expected_fields_present(self):
        tx   = self._get_tx(Transaction.Type.CREDIT)
        data = TransactionSerializer(tx).data
        for field in ["id", "trade_id", "service_name", "amount", "transaction_type", "created_at"]:
            self.assertIn(field, data)

    # ── Integridad ───────────────────────────────

    def test_two_transactions_created_per_completed_trade(self):
        txs = Transaction.objects.filter(trade=self.trade)
        self.assertEqual(txs.count(), 2)

    def test_net_credit_sum_is_zero(self):
        """Los créditos que salen de uno entran en el otro → suma neta = 0."""
        total = sum(
            tx.amount for tx in Transaction.objects.filter(trade=self.trade)
        )
        self.assertEqual(total, 0)

    def test_amounts_match_credits_amount(self):
        credit = self._get_tx(Transaction.Type.CREDIT)
        debit  = self._get_tx(Transaction.Type.DEBIT)
        self.assertEqual(credit.amount,  4)
        self.assertEqual(debit.amount,  -4)
