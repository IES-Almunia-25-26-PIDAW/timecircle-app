from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from django.db import IntegrityError

from rest_framework.test import APITestCase
from rest_framework import status

from api.serializers import UserSerializer
from .models import Rating, Transaction, User, Skill, Service, Trade, Message, Tag, UserSkill
from datetime import timedelta

# Models

class ModelsTestCase(TestCase):

    def setUp(self):
        # Usuarios
        self.user1 = User.objects.create_user(
            username="user1",
            password="1234",
            dni="11111111A"
        )

        self.user2 = User.objects.create_user(
            username="user2",
            password="1234",
            dni="22222222B"
        )

        # Tag
        self.tag = Tag.objects.create(
            name="Programación",
            description="Relacionado con código"
        )

        # Skill
        self.skill = Skill.objects.create(
            name="Python",
            description="Lenguaje Python"
        )
        self.skill.tags.add(self.tag)

        # Service
        self.service = Service.objects.create(
            title="Clases Python",
            description="Aprende desde cero",
            skill=self.skill,
            provider=self.user1
        )
        
    def test_user_creation(self):
        self.assertEqual(self.user1.coins, 0)
        self.assertTrue(self.user1.is_active)
    
    def test_tag_creation(self):
        self.assertEqual(self.tag.name, "Programación")
    
    def test_skill_unique_name(self):
        with self.assertRaises(IntegrityError):
            Skill.objects.create(name="Python")
            
    def test_user_skill_unique_together(self):
        UserSkill.objects.create(
            user=self.user1,
            skill=self.skill,
            level=UserSkill.Level.BASIC
        )

        with self.assertRaises(IntegrityError):
            UserSkill.objects.create(
                user=self.user1,
                skill=self.skill
            )
            
    def test_service_creation(self):
        self.assertTrue(self.service.is_active)
        self.assertEqual(self.service.provider, self.user1)
    
    def test_trade_valid_dates(self):
        start = timezone.now()
        end = start + timedelta(hours=2)

        trade = Trade.objects.create(
            client=self.user2,
            service=self.service,
            start_date=start,
            end_date=end
        )

        self.assertEqual(trade.status, Trade.Status.REQUESTED)

    def test_trade_invalid_dates(self):
        start = timezone.now()
        end = start - timedelta(hours=1)

        with self.assertRaises(IntegrityError):
            Trade.objects.create(
                client=self.user2,
                service=self.service,
                start_date=start,
                end_date=end
            )

    def test_transaction_creation(self):
        start = timezone.now()
        end = start + timedelta(hours=1)

        trade = Trade.objects.create(
            client=self.user2,
            service=self.service,
            start_date=start,
            end_date=end
        )

        transaction = Transaction.objects.create(
            user=self.user1,
            trade=trade,
            amount=10
        )

        self.assertEqual(transaction.amount, 10)
        self.assertEqual(transaction.user, self.user1)

    def test_message_creation(self):
        start = timezone.now()
        end = start + timedelta(hours=1)

        trade = Trade.objects.create(
            client=self.user2,
            service=self.service,
            start_date=start,
            end_date=end
        )

        message = Message.objects.create(
            trade=trade,
            sender=self.user1,
            content="Hola"
        )

        self.assertEqual(message.content, "Hola")

    def test_rating_valid(self):
        start = timezone.now()
        end = start + timedelta(hours=1)

        trade = Trade.objects.create(
            client=self.user2,
            service=self.service,
            start_date=start,
            end_date=end
        )

        rating = Rating.objects.create(
            trade=trade,
            author=self.user1,
            target=self.user2,
            subject="Buen servicio",
            comment="Muy bien",
            grade=5
        )

        self.assertEqual(rating.grade, 5)

    def test_rating_invalid_grade(self):
        start = timezone.now()
        end = start + timedelta(hours=1)

        trade = Trade.objects.create(
            client=self.user2,
            service=self.service,
            start_date=start,
            end_date=end
        )

        with self.assertRaises(IntegrityError):
            Rating.objects.create(
                trade=trade,
                author=self.user1,
                target=self.user2,
                subject="Mal",
                comment="Muy mal",
                grade=6  # fuera de rango
            )

# Serializers

class UserSerializerTest(TestCase):

    def test_user_serialization(self):
        user = User.objects.create_user(
            username="juan",
            password="1234",
            dni="11111111A"
        )

        serializer = UserSerializer(user)
        data = serializer.data

        self.assertEqual(data["username"], "juan")
        self.assertEqual(data["dni"], "11111111A")
        self.assertEqual(data["coins"], 0)
        
# API Test

class ServiceAPITest(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="provider",
            password="1234",
            dni="22222222B"
        )

        self.skill = Skill.objects.create(name="Java")

        self.client.force_authenticate(user=self.user)

    def test_create_service(self):
        url = reverse("services-list")  # si usas router

        data = {
            "title": "Clases Java",
            "description": "Aprende Java",
            "skill": self.skill.id,
            "provider": self.user.id
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Service.objects.count(), 1)

class TradeAPITest(APITestCase):
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="provider",
            password="1234",
            dni="22222222B"
        )

        self.skill = Skill.objects.create(name="Java")

        self.service = Service.objects.create(
            title="Clases Python",
            skill=self.skill,
            provider=self.user
        )

        self.client.force_authenticate(user=self.user)
    
    def test_create_trade_invalid_dates(self):
        url = reverse("trades-list")

        start = timezone.now()
        end = start - timedelta(hours=1)

        data = {
            "client": self.user.id,
            "service": self.service.id,
            "start_date": start,
            "end_date": end
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)