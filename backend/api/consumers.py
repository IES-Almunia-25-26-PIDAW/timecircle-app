from channels.generic.websocket import AsyncWebsocketConsumer
from django.core import signing
from django.utils import timezone
import json

from asgiref.sync import sync_to_async
import logging

logger = logging.getLogger(__name__)

WS_KEY_MAX_AGE = 120  # seconds

class PresenceConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.subscribed_conversations = set()

    async def connect(self):
        # Expect ws_key in query string: ?ws_key=...
        print('WS connect scope.query_string:', self.scope.get('query_string'))
        from urllib.parse import parse_qs
        qs = self.scope['query_string'].decode()
        params = parse_qs(qs)
        ws_key = params.get('ws_key', [None])[0]
        user = None
        if ws_key:
            try:
                payload = signing.loads(ws_key, max_age=WS_KEY_MAX_AGE)
                user_id = payload.get('user_id')
                user = await self.get_user(user_id)
            except signing.SignatureExpired:
                print('WS connect: ws_key expired')
                await self.close(code=4001)
                return
            except signing.BadSignature:
                print('WS connect: bad ws_key signature')
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
        for cid in list(getattr(self, 'subscribed_conversations', set())):
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
        if action == 'subscribe':
            cid = data.get('conversation_id')
            if cid:
                await self.channel_layer.group_add(f'conversation_{cid}', self.channel_name)
                self.subscribed_conversations.add(cid)
        elif action == 'unsubscribe':
            cid = data.get('conversation_id')
            if cid and cid in self.subscribed_conversations:
                await self.channel_layer.group_discard(f'conversation_{cid}', self.channel_name)
                self.subscribed_conversations.discard(cid)
        elif action == 'typing':
            cid = data.get('conversation_id')
            is_typing = bool(data.get('is_typing'))
            # Update presence typing fields
            try:
                presence = await self.get_presence()
                if presence:
                    if is_typing:
                        presence.typing_in_id = cid
                        presence.typing_at = timezone.now()
                    else:
                        presence.typing_in_id = None
                        presence.typing_at = None
                    await sync_to_async(presence.save)()
                    # Broadcast typing state to conversation group
                    await self.channel_layer.group_send(
                        f'conversation_{cid}',
                        {
                            'type': 'presence.message',
                            'user_id': self.user.id,
                            'status': presence.effective_status,
                            'typing': is_typing,
                        }
                    )
            except Exception:
                logger.warning("Failed to process typing update", exc_info=True)
        elif action == 'send_message':
            cid = data.get('conversation_id')
            content = data.get('content', '').strip()
            if cid and content:
                try:
                    from .models import Message, Conversation
                    # Verify conversation exists and user is participant
                    conv = await sync_to_async(Conversation.objects.get)(id=cid)
                    if self.user in await sync_to_async(lambda: list(conv.participants.all()))():
                        # Create message
                        msg = await sync_to_async(Message.objects.create)(
                            conversation=conv,
                            sender=self.user,
                            content=content
                        )
                        # Broadcast message to conversation group
                        await self.channel_layer.group_send(
                            f'conversation_{cid}',
                            {
                                'type': 'message.received',
                                'id': msg.id,
                                'conversation_id': cid,
                                'sender_id': self.user.id,
                                'sender_name': self.user.get_full_name() or self.user.username,
                                'sender_avatar': getattr(self.user, 'avatar', ''),
                                'content': msg.content,
                                'timestamp': msg.timestamp.isoformat(),
                                'read': msg.read,
                            }
                        )
                except Exception as e:
                    logger.error(f'Error sending message: {e}')
        elif action == 'heartbeat':
            status = data.get('status', 'online')
            try:
                presence = await self.get_presence()
                if presence:
                    presence.status = status
                    presence.last_active = timezone.now()
                    await sync_to_async(presence.save)()
                    # Optionally broadcast status to subscribed conversations
                    for cid in self.subscribed_conversations:
                        await self.channel_layer.group_send(
                            f'conversation_{cid}',
                            {
                                'type': 'presence.message',
                                'user_id': self.user.id,
                                'status': presence.effective_status,
                                'typing': bool(presence.typing_conversation_id == cid),
                            }
                        )
            except Exception as e:
                logger.exception("Error handling heartbeat for user %s: %s", getattr(self.user, "id", None), e)

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

    # Helpers
    async def get_user(self, user_id):
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            return await sync_to_async(User.objects.get)(id=user_id)
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
