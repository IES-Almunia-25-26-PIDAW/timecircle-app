from django.test import TestCase
from asgiref.sync import async_to_sync
from django.core import signing
import json

from api.consumers import PresenceConsumer
from api.tests.factories import make_user, make_conversation
from api.models import Message


class DummyChannelLayer:
    def __init__(self):
        self.added = []
        self.discarded = []
        self.sent = []

    async def group_add(self, group, channel_name):
        self.added.append((group, channel_name))

    async def group_discard(self, group, channel_name):
        self.discarded.append((group, channel_name))

    async def group_send(self, group, message):
        self.sent.append((group, message))


class ConsumerTests(TestCase):

    def test_get_user_and_presence(self):
        u = make_user(username='cuser', email='cuser@example.com')
        consumer = PresenceConsumer(scope={'query_string': b''})

        # get_user should return the user instance
        res = async_to_sync(consumer.get_user)(u.id)
        self.assertEqual(res.id, u.id)

        # get_presence should create and return a presence object for the consumer.user
        consumer.user = u
        pres = async_to_sync(consumer.get_presence)()
        self.assertEqual(pres.user, u)
        self.assertEqual(pres.status, 'online')

    def test_subscribe_unsubscribe_and_send_message_and_typing(self):
        u = make_user(username='u1', email='u1@example.com')
        other = make_user(username='u2', email='u2@example.com')
        conv = make_conversation(u, other)

        consumer = PresenceConsumer(scope={'query_string': b''})
        consumer.user = u
        consumer.channel_layer = DummyChannelLayer()
        consumer.channel_name = 'chan1'

        # Subscribe
        async_to_sync(consumer.receive)(text_data=json.dumps({'action': 'subscribe', 'conversation_id': conv.id}))
        self.assertIn(conv.id, consumer.subscribed_conversations)
        self.assertIn((f'conversation_{conv.id}', 'chan1'), consumer.channel_layer.added)

        # Typing (should update presence and broadcast)
        async_to_sync(consumer.receive)(text_data=json.dumps({'action': 'typing', 'conversation_id': conv.id, 'is_typing': True}))
        found_presence = any(m for g, m in consumer.channel_layer.sent if m.get('type') == 'presence.message')
        self.assertTrue(found_presence)

        # Send message
        async_to_sync(consumer.receive)(text_data=json.dumps({'action': 'send_message', 'conversation_id': conv.id, 'content': 'Hi there'}))
        self.assertTrue(Message.objects.filter(conversation=conv, content='Hi there', sender=u).exists())
        found_msg = any(m for g, m in consumer.channel_layer.sent if m.get('type') == 'message.received')
        self.assertTrue(found_msg)

        # Unsubscribe
        async_to_sync(consumer.receive)(text_data=json.dumps({'action': 'unsubscribe', 'conversation_id': conv.id}))
        self.assertNotIn(conv.id, consumer.subscribed_conversations)
        self.assertIn((f'conversation_{conv.id}', 'chan1'), consumer.channel_layer.discarded)

    def test_connect_branches_and_accept(self):
        consumer = PresenceConsumer()
        consumer.scope = {'query_string': b''}

        # missing ws_key -> close 4003
        closed = {}
        async def close(code=None):
            closed['code'] = code
        consumer.close = close
        async_to_sync(consumer.connect)()
        self.assertEqual(closed.get('code'), 4003)

    def test_connect_bad_and_expired_and_user_not_found(self):
        consumer = PresenceConsumer()
        consumer.scope = {'query_string': b'ws_key=token'}
        # Monkeypatch signing.loads to raise BadSignature
        real_loads = signing.loads
        try:
            signing.loads = lambda *a, **k: (_ for _ in ()).throw(signing.BadSignature())
            closed = {}
            async def close(code=None):
                closed.setdefault('code', code)
            consumer.close = close
            async_to_sync(consumer.connect)()
            self.assertEqual(closed.get('code'), 4002)

            # expired
            signing.loads = lambda *a, **k: (_ for _ in ()).throw(signing.SignatureExpired())
            closed = {}
            async def close(code=None):
                closed.setdefault('code', code)
            consumer.close = close
            async_to_sync(consumer.connect)()
            self.assertEqual(closed.get('code'), 4001)

            # user not found
            signing.loads = lambda *a, **k: {'user_id': 999999}
            closed = {}
            async def close(code=None):
                closed.setdefault('code', code)
            consumer.close = close
            async_to_sync(consumer.connect)()
            self.assertEqual(closed.get('code'), 4004)
        finally:
            signing.loads = real_loads

    def test_connect_success(self):
        u = make_user(username='connectuser', email='cu@example.com')
        token = signing.dumps({'user_id': u.id})
        consumer = PresenceConsumer()
        consumer.scope = {'query_string': f'ws_key={token}'.encode()}
        accepted = {'ok': False}
        async def accept():
            accepted.__setitem__('ok', True)
        consumer.accept = accept
        async_to_sync(consumer.connect)()
        self.assertTrue(accepted['ok'])
        self.assertEqual(consumer.user.id, u.id)

    def test_receive_invalid_and_empty(self):
        consumer = PresenceConsumer(scope={'query_string': b''})
        # No text_data
        async_to_sync(consumer.receive)(text_data=None)
        # invalid json
        async_to_sync(consumer.receive)(text_data='not-json')

    def test_trade_event_and_send_handlers(self):
        consumer = PresenceConsumer()
        consumer.scope = {'query_string': b''}
        sent = []
        async def capture_send(text_data=None, bytes_data=None):
            sent.append(text_data)
        consumer.send = capture_send

        # normal trade_event
        async_to_sync(consumer.trade_event)({'payload': {'x': 1}})
        self.assertTrue(any('trade.event' in s for s in sent))

        # send raising should be caught
        async def raise_send(*a, **k):
            raise Exception('boom')
        consumer.send = raise_send
        # should not raise
        async_to_sync(consumer.trade_event)({'payload': {'x': 2}})

    def test_presence_and_message_forwarding(self):
        consumer = PresenceConsumer()
        consumer.scope = {'query_string': b''}
        captured = []
        async def capture_send(text_data=None, bytes_data=None):
            captured.append(text_data)
        consumer.send = capture_send
        async_to_sync(consumer.presence_message)({'user_id': 1, 'status': 'online', 'typing': True})
        async_to_sync(consumer.message_received)({'id': 2, 'conversation_id': 3, 'sender_id': 4, 'sender_name': 'X', 'sender_avatar': '', 'content': 'hi', 'timestamp': 't', 'read': False})
        self.assertEqual(len(captured), 2)
