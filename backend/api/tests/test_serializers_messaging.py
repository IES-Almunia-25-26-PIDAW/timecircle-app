"""
test_serializers_messaging.py – Tests de los serializers de mensajería.

Cubre:
  · ConversationSerializer  → creación, reutilización, validación de participantes
  · MessageSerializer       → campos de lectura, sender embebido
  · MessageCreateSerializer → validación de contenido vacío y longitud
"""

from django.test import TestCase, RequestFactory

from api.models import Conversation, Message
from api.serializers import (
    ConversationSerializer,
    MessageSerializer,
    MessageCreateSerializer,
)
from .factories import (
    make_user, make_conversation, make_message,
)


def _request(user):
    req = RequestFactory().post("/")
    req.user = user
    return req


# ══════════════════════════════════════════════
#  CONVERSATION CREATE
# ══════════════════════════════════════════════

class ConversationCreateTests(TestCase):

    def setUp(self):
        self.alice = make_user(username="alice_msg", email="alice_msg@x.com")
        self.bob   = make_user(username="bob_msg",   email="bob_msg@x.com")

    def test_create_conversation_between_two_users(self):
        s = ConversationSerializer(
            data={"participant_ids": [self.alice.id, self.bob.id]},
            context={"request": _request(self.alice)},
        )
        self.assertTrue(s.is_valid(), s.errors)
        conv = s.save()
        self.assertEqual(conv.participants.count(), 2)

    def test_current_user_added_if_not_in_list(self):
        """Si el usuario actual no está en los IDs, debe añadirse automáticamente."""
        s = ConversationSerializer(
            data={"participant_ids": [self.bob.id]},   # alice no está
            context={"request": _request(self.alice)},
        )
        self.assertTrue(s.is_valid(), s.errors)
        conv = s.save()
        participant_ids = list(conv.participants.values_list("id", flat=True))
        self.assertIn(self.alice.id, participant_ids)

    def test_single_participant_rejected(self):
        """Una conversación consigo mismo no es válida."""
        s = ConversationSerializer(
            data={"participant_ids": [self.alice.id]},
            context={"request": _request(self.alice)},
        )
        # Tras añadir al usuario actual sigue siendo solo alice → inválido
        self.assertFalse(s.is_valid())
        self.assertIn("participant_ids", s.errors)

    def test_existing_conversation_reused(self):
        """Si ya existe una conversación entre esos usuarios, se devuelve la misma."""
        conv1 = make_conversation(self.alice, self.bob)

        s = ConversationSerializer(
            data={"participant_ids": [self.alice.id, self.bob.id]},
            context={"request": _request(self.alice)},
        )
        self.assertTrue(s.is_valid(), s.errors)
        conv2 = s.save()

        self.assertEqual(conv1.pk, conv2.pk)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_participants_exposed_on_read(self):
        conv = make_conversation(self.alice, self.bob)
        data = ConversationSerializer(
            conv, context={"request": _request(self.alice)}
        ).data
        self.assertIsInstance(data["participants"], list)
        self.assertEqual(len(data["participants"]), 2)

    def test_last_message_is_none_for_empty_conversation(self):
        conv = make_conversation(self.alice, self.bob)
        data = ConversationSerializer(
            conv, context={"request": _request(self.alice)}
        ).data
        self.assertIsNone(data["last_message"])

    def test_last_message_shows_content(self):
        conv = make_conversation(self.alice, self.bob)
        make_message(conv, self.alice, "Hola Bob!")
        data = ConversationSerializer(
            conv, context={"request": _request(self.alice)}
        ).data
        self.assertEqual(data["last_message"], "Hola Bob!")

    def test_unread_count_excludes_own_messages(self):
        conv = make_conversation(self.alice, self.bob)
        make_message(conv, self.bob, "Mensaje de Bob")   # no leído por Alice

        data = ConversationSerializer(
            conv, context={"request": _request(self.alice)}
        ).data
        self.assertEqual(data["unread_count"], 1)

    def test_unread_count_zero_for_own_messages(self):
        conv = make_conversation(self.alice, self.bob)
        make_message(conv, self.alice, "Mi propio mensaje")

        data = ConversationSerializer(
            conv, context={"request": _request(self.alice)}
        ).data
        self.assertEqual(data["unread_count"], 0)

    def test_write_only_participant_ids_not_in_output(self):
        conv = make_conversation(self.alice, self.bob)
        data = ConversationSerializer(
            conv, context={"request": _request(self.alice)}
        ).data
        self.assertNotIn("participant_ids", data)


# ══════════════════════════════════════════════
#  MESSAGE CREATE
# ══════════════════════════════════════════════

class MessageCreateSerializerTests(TestCase):

    def test_valid_message(self):
        s = MessageCreateSerializer(data={"content": "Hola, ¿cómo estás?"})
        self.assertTrue(s.is_valid(), s.errors)

    def test_empty_content_rejected(self):
        s = MessageCreateSerializer(data={"content": ""})
        self.assertFalse(s.is_valid())
        self.assertIn("content", s.errors)

    def test_whitespace_only_rejected(self):
        s = MessageCreateSerializer(data={"content": "   "})
        self.assertFalse(s.is_valid())
        self.assertIn("content", s.errors)

    def test_content_over_1000_chars_rejected(self):
        s = MessageCreateSerializer(data={"content": "x" * 1001})
        self.assertFalse(s.is_valid())
        self.assertIn("content", s.errors)

    def test_content_exactly_1000_chars_ok(self):
        s = MessageCreateSerializer(data={"content": "a" * 1000})
        self.assertTrue(s.is_valid(), s.errors)

    def test_content_stripped(self):
        s = MessageCreateSerializer(data={"content": "  Hola  "})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["content"], "Hola")


# ══════════════════════════════════════════════
#  MESSAGE SERIALIZER (lectura)
# ══════════════════════════════════════════════

class MessageReadSerializerTests(TestCase):

    def setUp(self):
        self.alice = make_user(username="alice_ms", email="alice_ms@x.com")
        self.bob   = make_user(username="bob_ms",   email="bob_ms@x.com")
        self.conv  = make_conversation(self.alice, self.bob)

    def test_fields_present(self):
        msg  = make_message(self.conv, self.alice, "Test")
        data = MessageSerializer(msg).data
        for field in ["id", "conversation", "sender", "content", "timestamp", "read"]:
            self.assertIn(field, data)

    def test_sender_is_nested_user(self):
        msg  = make_message(self.conv, self.alice, "Nested sender")
        data = MessageSerializer(msg).data
        self.assertIsInstance(data["sender"], dict)
        self.assertEqual(data["sender"]["username"], "alice_ms")

    def test_read_defaults_false(self):
        msg  = make_message(self.conv, self.alice)
        data = MessageSerializer(msg).data
        self.assertFalse(data["read"])

    def test_read_true_after_mark_read(self):
        msg      = make_message(self.conv, self.alice)
        msg.read = True
        msg.save()
        data = MessageSerializer(msg).data
        self.assertTrue(data["read"])
