from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch
from django.core import signing
from rest_framework import status
import decimal

from api.tests.factories import (
    make_user, make_admin, make_conversation, make_message,
    make_category, make_skill, make_service, make_trade, make_completed_trade, make_review
)
from api.models import PasswordResetCode, UserPresence, ContactMessage, Message, Conversation, Transaction, Service, Review
from rest_framework_simplejwt.tokens import RefreshToken


class ViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_me_and_ws_handshake(self):
        data = {
            'username': 'reguser',
            'email': 'reg@example.com',
            'first_name': 'Reg',
            'last_name': 'User',
            'password': 'Str0ng!Pass1',
            'password2': 'Str0ng!Pass1',
        }
        resp = self.client.post('/api/auth/register/', data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIn('user', resp.data)
        self.assertIn('tokens', resp.data)

        user_id = resp.data['user']['id']

        # Authenticate and call /me/
        from api.models import User
        user = User.objects.get(id=user_id)
        self.client.force_authenticate(user=user)

        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['id'], user.id)

        # WS handshake returns a signed token containing the user id
        hs = self.client.post('/api/auth/ws-handshake/')
        self.assertEqual(hs.status_code, 200)
        self.assertIn('ws_key', hs.data)
        payload = signing.loads(hs.data['ws_key'])
        self.assertEqual(payload.get('user_id'), user.id)

    def test_request_and_confirm_password_reset(self):
        user = make_user(username='pwuser', email='pw@example.com')

        # Patch send_mail to avoid external sending and assert it's called
        with patch('api.views.send_mail') as mock_send:
            resp = self.client.post('/api/auth/request-password-reset/', {'email': user.email}, format='json')
            self.assertEqual(resp.status_code, 200)
            self.assertTrue(PasswordResetCode.objects.filter(user=user).exists())
            self.assertTrue(mock_send.called)

        # Confirm: use the latest code
        prc = PasswordResetCode.objects.filter(user=user).first()
        self.assertIsNotNone(prc)

        resp2 = self.client.post('/api/auth/confirm-password-reset/', {
            'email': user.email,
            'code': prc.code,
            'new_password': 'NewStrong!Pass2',
        }, format='json')
        self.assertEqual(resp2.status_code, 200)

        # Password should be changed
        user.refresh_from_db()
        self.assertTrue(user.check_password('NewStrong!Pass2'))

    def test_presence_views_and_contact(self):
        user = make_user(username='puser', email='puser@example.com')
        other = make_user(username='other', email='other@example.com')
        conv = make_conversation(user, other)

        self.client.force_authenticate(user=user)

        # Heartbeat
        hb = self.client.post('/api/presence/heartbeat/', {'status': 'online'}, format='json')
        self.assertEqual(hb.status_code, 200)
        pres = UserPresence.objects.get(user=user)
        self.assertEqual(pres.status, 'online')

        # Typing
        tp = self.client.post('/api/presence/typing/', {'conversation_id': conv.id, 'is_typing': True}, format='json')
        self.assertEqual(tp.status_code, 200)
        self.assertEqual(tp.data.get('is_typing'), True)
        pres.refresh_from_db()
        self.assertEqual(pres.typing_in_id, conv.id)

        # Presence status query
        st = self.client.get(f'/api/presence/?user_id={user.id}&conversation_id={conv.id}')
        self.assertEqual(st.status_code, 200)
        self.assertIn('status', st.data)
        self.assertIn('is_typing', st.data)

        # Contact form (public)
        contact = self.client.post('/api/contact/', {
            'name': 'Tester',
            'email': 'tester@example.com',
            'reason': 'soporte',
            'message': 'a' * 30,
        }, format='json')
        self.assertEqual(contact.status_code, 201)
        self.assertTrue(ContactMessage.objects.filter(email='tester@example.com').exists())

    def test_conversation_send_and_mark_read_and_admin_stats(self):
        user = make_user(username='cuser', email='cuser@example.com')
        other = make_user(username='cother', email='cother@example.com')
        conv = make_conversation(user, other)

        # Message from other to user
        msg = make_message(conv, other, 'Hello there!')

        self.client.force_authenticate(user=user)

        # Send message as participant
        sresp = self.client.post(f'/api/conversations/{conv.id}/messages/', {'content': 'Reply'}, format='json')
        self.assertEqual(sresp.status_code, 201)
        self.assertTrue(Message.objects.filter(conversation=conv, content='Reply').exists())

        # Mark as read: should mark messages not sent by `user`
        mresp = self.client.patch(f'/api/conversations/{conv.id}/read/', {}, format='json')
        self.assertEqual(mresp.status_code, 200)
        self.assertIn('marked_as_read', mresp.data)

        # Admin stats: non-admin cannot access
        normal = make_user(username='normal', email='normal@example.com')
        self.client.force_authenticate(user=normal)
        aresp = self.client.get('/api/admin/stats/')
        self.assertEqual(aresp.status_code, 403)

        # Admin can access
        admin = make_admin(username='superadmin', email='admin@example.com')
        self.client.force_authenticate(user=admin)
        aresp2 = self.client.get('/api/admin/stats/')
        self.assertEqual(aresp2.status_code, 200)
        self.assertIn('total_users', aresp2.data)


class AuthAndPresenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_login_returns_user_and_tokens(self):
        user = make_user(username='loginuser', email='login@example.com', password='Login!Pass')
        resp = self.client.post('/api/auth/login/', {'username': user.username, 'password': 'Login!Pass'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('user', resp.data)
        # Tokens may be returned either as top-level 'access'/'refresh' or nested under 'tokens'
        self.assertTrue(
            (isinstance(resp.data, dict) and 'access' in resp.data and 'refresh' in resp.data)
            or ('tokens' in resp.data and 'access' in resp.data['tokens'] and 'refresh' in resp.data['tokens'])
        )

    def test_logout_cleans_presence_and_notifies_groups(self):
        user = make_user(username='logout', email='logout@example.com', credits=0)
        other = make_user(username='member', email='member@example.com')
        conv = make_conversation(user, other)

        # create presence record
        UserPresence.objects.create(user=user)

        # generate a valid refresh token
        refresh = str(RefreshToken.for_user(user))

        dummy_sent = []

        class DummyChannel:
            async def group_send(self, group, message):
                dummy_sent.append((group, message))

        # Patch blacklist to be a no-op and channel layer to our dummy
        with patch('api.views.RefreshToken.blacklist', return_value=None), \
             patch('api.views.get_channel_layer', return_value=DummyChannel()):
            self.client.force_authenticate(user=user)
            r = self.client.post('/api/auth/logout/', {'refresh': refresh}, format='json')
            self.assertEqual(r.status_code, 200)
            # channel sends should include at least one conversation group
            self.assertTrue(any('conversation_' in grp for grp, _ in dummy_sent))

    def test_logout_with_invalid_token_returns_400(self):
        user = make_user(username='badlogout', email='badlogout@example.com')
        self.client.force_authenticate(user=user)
        r = self.client.post('/api/auth/logout/', {'refresh': 'invalidtoken'}, format='json')
        self.assertEqual(r.status_code, 400)


class UserViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_user_ranking_services_reviews_and_transactions_and_activity(self):
        user = make_user(username='uA', email='ua@example.com', credits=5)
        offerer = make_user(username='uB', email='ub@example.com', credits=5)

        # create service and trade/review
        svc = make_service(offerer)
        trade = make_completed_trade(offerer, user)
        make_review(trade=trade, reviewer=offerer, reviewee=user, rating=4)

        # transactions: created by factory when making completed trade

        self.client.force_authenticate(user=user)

        # ranking
        r = self.client.get('/api/users/ranking/')
        self.assertEqual(r.status_code, 200)

        # services for offerer
        r2 = self.client.get(f'/api/users/{offerer.id}/services/')
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(isinstance(r2.data, list))

        # reviews for user
        r3 = self.client.get(f'/api/users/{user.id}/reviews/')
        self.assertEqual(r3.status_code, 200)
        self.assertTrue(any(review['rating'] == 4 for review in r3.data))

        # transactions list (for authenticated user)
        r4 = self.client.get('/api/users/transactions/')
        self.assertEqual(r4.status_code, 200)

        # activity
        r5 = self.client.get('/api/users/activity/')
        self.assertEqual(r5.status_code, 200)
        self.assertIn('monthly_activity', r5.data)

    def test_skills_post_awards_onboarding_bonus(self):
        user = make_user(username='skuser', email='sk@example.com', credits=decimal.Decimal('0.0'))
        skill = make_skill(name='TestingSkill')
        self.client.force_authenticate(user=user)

        resp = self.client.post('/api/users/skills/', {'skill_id': skill.id}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        user.refresh_from_db()
        # bonus of 0.5 awarded
        self.assertAlmostEqual(float(user.credits), 0.5)
        tx = Transaction.objects.filter(user=user, amount=decimal.Decimal('0.5')).first()
        self.assertIsNotNone(tx)


class SkillAndServicePermissionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_skill_create_requires_admin(self):
        user = make_user(username='normal', email='normal@x.com')
        self.client.force_authenticate(user=user)
        resp = self.client.post('/api/skills/', {'name': 'NewSkill', 'description': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        admin = make_admin(username='admin1', email='admin1@x.com')
        self.client.force_authenticate(user=admin)
        resp2 = self.client.post('/api/skills/', {'name': 'NewSkill', 'description': 'x'}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

    def test_service_create_awards_first_service_bonus_and_owner_checks(self):
        user = make_user(username='suser', email='suser@example.com', credits=decimal.Decimal('0.0'))
        cat = make_category(name='CatTest')
        self.client.force_authenticate(user=user)

        payload = {
            'title': 'My Service',
            'description': 'Service desc',
            'category_id': cat.id,
            'duration': 60,
            'credits': 2,
            'type': 'offer',
        }
        r = self.client.post('/api/services/', payload, format='json')
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        user.refresh_from_db()
        self.assertAlmostEqual(float(user.credits), 0.5)
        bonus_tx = Transaction.objects.filter(user=user, amount=decimal.Decimal('0.5')).first()
        self.assertIsNotNone(bonus_tx)

        # owner check on update/destroy
        other = make_user(username='otherx', email='otherx@example.com')
        svc_id = r.data['id']
        self.client.force_authenticate(user=other)
        upd = self.client.put(f'/api/services/{svc_id}/', {'title': 'X', 'category_id': cat.id, 'duration': 60, 'credits': 2, 'type': 'offer'}, format='json')
        self.assertEqual(upd.status_code, status.HTTP_403_FORBIDDEN)


class TradeFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_trade_status_transitions_and_credit_transfer(self):
        offerer = make_user(username='offerA', email='offA@example.com', credits=decimal.Decimal('0.0'))
        requester = make_user(username='reqA', email='reqA@example.com', credits=decimal.Decimal('10.0'))
        service = make_service(offerer, credits=2)
        trade = make_trade(offerer, requester, service=service)

        # Non-participant cannot update (resource is not visible → 404)
        outsider = make_user(username='outs', email='outs@example.com')
        self.client.force_authenticate(user=outsider)
        r = self.client.patch(f'/api/trades/{trade.id}/status/', {'status': 'accepted'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

        # Participant transitions: pending -> accepted -> in_progress -> completed
        self.client.force_authenticate(user=offerer)
        r1 = self.client.patch(f'/api/trades/{trade.id}/status/', {'status': 'accepted'}, format='json')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)

        r2 = self.client.patch(f'/api/trades/{trade.id}/status/', {'status': 'in_progress'}, format='json')
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

        r3 = self.client.patch(f'/api/trades/{trade.id}/status/', {'status': 'completed'}, format='json')
        self.assertEqual(r3.status_code, status.HTTP_200_OK)

        # After completion, transactions for both users exist
        txs_offer = Transaction.objects.filter(user=offerer, transaction_type='credit')
        txs_req = Transaction.objects.filter(user=requester, transaction_type='debit')
        self.assertTrue(txs_offer.exists())
        self.assertTrue(txs_req.exists())


class AdminUserEndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_admin_user_destroy_self_and_activate_and_stats(self):
        admin = make_admin(username='boss', email='boss@example.com')
        other = make_user(username='target', email='target@example.com')

        # Admin cannot deactivate themselves
        self.client.force_authenticate(user=admin)
        resp = self.client.delete(f'/api/admin/users/{admin.id}/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Admin can deactivate another user
        resp2 = self.client.delete(f'/api/admin/users/{other.id}/')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        other.refresh_from_db()
        self.assertFalse(other.is_active)

        # Reactivate via activate endpoint
        resp3 = self.client.patch(f'/api/admin/users/{other.id}/activate/')
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)

        # user_stats
        resp4 = self.client.get(f'/api/admin/users/{other.id}/stats/')
        self.assertEqual(resp4.status_code, status.HTTP_200_OK)
        self.assertIn('user', resp4.data)
