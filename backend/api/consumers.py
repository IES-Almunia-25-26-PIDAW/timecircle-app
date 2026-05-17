from channels.generic.websocket import AsyncWebsocketConsumer
from django.core import signing
from django.utils import timezone
import json

from asgiref.sync import sync_to_async
import logging

logger = logging.getLogger(__name__)

WS_KEY_MAX_AGE_SECONDS = 120

class PresenceConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.subscribed_conversations = set()

    async def connect(self):
        # Expect ws_key in query string: ?ws_key=...
        logger.debug('WS connect scope.query_string: %r', self.scope.get('query_string'))
        from urllib.parse import parse_qs
        qs = self.scope['query_string'].decode()
        params = parse_qs(qs)
        ws_key = params.get('ws_key', [None])[0]
        user = None
        if ws_key:
            try:
                payload = signing.loads(ws_key, max_age=WS_KEY_MAX_AGE_SECONDS)
                user_id = payload.get('user_id')
                user = await self.get_user(user_id)
            except signing.SignatureExpired:
                logger.warning("WS connect: ws_key expired")
                await self.close(code=4001)
                return
            except signing.BadSignature:
                logger.warning('WS connect: bad ws_key signature')
                await self.close(code=4002)
                return
        else:
            # Reject anonymous WS connections
            logger.warning('WS connect: missing ws_key')
            await self.close(code=4003)
            return

        if not user:
            logger.warning('WS connect: user not found for provided ws_key payload')
            await self.close(code=4004)
            return

        self.scope['user'] = user
        self.user = user

        await self.accept()

    async def disconnect(self, close_code):
        # Leave groups
        for cid in getattr(self, 'subscribed_conversations', set()):
            await self.channel_layer.group_discard(f'conversation_{cid}', self.channel_name)

    # Client messages
    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            data = json.loads(text_data)
        except Exception:
            return

        action = data.get('action')
        handler = self._ACTION_HANDLERS.get(action)
        if handler:
            await handler(self, data)

    async def _handle_subscribe(self, data: dict):
        cid = data.get('conversation_id')
        if cid:
            await self.channel_layer.group_add(f'conversation_{cid}', self.channel_name)
            self.subscribed_conversations.add(cid)


    async def _handle_unsubscribe(self, data: dict):
        cid = data.get('conversation_id')
        if cid and cid in self.subscribed_conversations:
            await self.channel_layer.group_discard(f'conversation_{cid}', self.channel_name)
            self.subscribed_conversations.discard(cid)


    async def _handle_typing(self, data: dict):
        cid = data.get('conversation_id')
        is_typing = bool(data.get('is_typing'))
        try:
            presence = await self.get_presence()
            if not presence:
                return
            presence.typing_in_id = cid if is_typing else None
            presence.typing_at    = timezone.now() if is_typing else None
            await sync_to_async(presence.save)()
            await self.channel_layer.group_send(
                f'conversation_{cid}',
                {
                    'type':    'presence.message',
                    'user_id': self.user.id,
                    'status':  presence.effective_status,
                    'typing':  is_typing,
                },
            )
        except Exception:
            logger.warning("Failed to process typing update", exc_info=True)


    async def _handle_send_message(self, data: dict):
        from .models import Message, Conversation

        cid     = data.get('conversation_id')
        content = data.get('content', '').strip()
        if not (cid and content):
            return
        try:
            conv         = await sync_to_async(Conversation.objects.get)(id=cid)
            participants = await sync_to_async(lambda: list(conv.participants.all()))()
            if self.user not in participants:
                return
            msg = await sync_to_async(Message.objects.create)(
                conversation=conv,
                sender=self.user,
                content=content,
            )
            await self.channel_layer.group_send(
                f'conversation_{cid}',
                {
                    'type':          'message.received',
                    'id':            msg.id,
                    'conversation_id': cid,
                    'sender_id':     self.user.id,
                    'sender_name':   self.user.get_full_name() or self.user.username,
                    'sender_avatar': getattr(self.user, 'avatar', ''),
                    'content':       msg.content,
                    'timestamp':     msg.timestamp.isoformat(),
                    'read':          msg.read,
                },
            )
        except Exception as e:
            logger.exception('Error sending message: %s', e)


    async def _handle_heartbeat(self, data: dict):
        try:
            presence = await self.get_presence()
            if not presence:
                return
            presence.status      = data.get('status', 'online')
            presence.last_active = timezone.now()
            await sync_to_async(presence.save)()
            for cid in self.subscribed_conversations:
                await self.channel_layer.group_send(
                    f'conversation_{cid}',
                    {
                        'type':    'presence.message',
                        'user_id': self.user.id,
                        'status':  presence.effective_status,
                        'typing':  bool(presence.typing_conversation_id == cid),
                    },
                )
        except Exception as e:
            logger.exception(
                "Error handling heartbeat for user %s: %s",
                getattr(self.user, 'id', None), e,
            )

    _ACTION_HANDLERS = {
        'subscribe':    _handle_subscribe,
        'unsubscribe':  _handle_unsubscribe,
        'typing':       _handle_typing,
        'send_message': _handle_send_message,
        'heartbeat':    _handle_heartbeat,
    }

    # Handler for messages sent to groups
    async def presence_message(self, event):
        # Forward presence event to client
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event.get('user_id'),
            'status': event.get('status'),
            'typing': event.get('typing', False),
        }))

    # Handler for chat messages sent to groups
    async def message_received(self, event):
        # Forward message event to client
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event.get('id'),
            'conversation_id': event.get('conversation_id'),
            'sender_id': event.get('sender_id'),
            'sender_name': event.get('sender_name'),
            'sender_avatar': event.get('sender_avatar'),
            'content': event.get('content'),
            'timestamp': event.get('timestamp'),
            'read': event.get('read', False),
        }))

    async def trade_event(self, event):
        try:
            payload = event.get('payload') or event
            await self.send(text_data=json.dumps({
                'type': 'trade.event',
                'payload': payload,
            }))
        except Exception:
            logger.exception('Failed to forward trade_event')

    # Helpers
    async def get_user(self, user_id):
        try:
            from django.contrib.auth import get_user_model
            user = get_user_model()
            return await sync_to_async(user.objects.get)(id=user_id)
        except Exception:
            return None

    async def get_presence(self):
        # Import models lazily to avoid app registry issues at module import time
        from .models import UserPresence

        pres, _created = await sync_to_async(UserPresence.objects.get_or_create)(
            user=self.user,
            defaults={'status': UserPresence.Status.ONLINE},
        )
        return pres
