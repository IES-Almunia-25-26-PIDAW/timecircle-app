"""
factories.py - Helpers reutilizables para crear fixtures en los tests de TimeCircle.
Importa desde aquí en cualquier test para evitar duplicación de código.
"""

from django.utils import timezone
from datetime import timedelta

from api.models import (
    User, Category, Tag,
    Service, Trade, Transaction,
    Conversation, Message, Review,
)

def make_user(
    username="testuser",
    email="test@example.com",
    password="Str0ng!Pass",
    credits=10,
    **kwargs,
) -> User:
    """Crea y devuelve un usuario activo con contraseña hasheada."""
    return User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=kwargs.pop("first_name", "Test"),
        last_name=kwargs.pop("last_name", "User"),
        credits=credits,
        **kwargs,
    )


def make_admin(username="admin", email="admin@example.com", password="Admin!Pass") -> User:
    return User.objects.create_superuser(
        username=username, email=email, password=password
    )

def make_category(name="Tecnología", description="Servicios tecnológicos", icon="monitor") -> Category:
    category, _ = Category.objects.get_or_create(
        name=name,
        defaults={"description": description, "icon": icon},
    )
    return category


def make_tag(name="python") -> Tag:
    tag, _ = Tag.objects.get_or_create(name=name)
    return tag

def make_service(
    user: User,
    service_type: str = Service.Type.OFFER,
    title: str = "Clases de Python",
    description: str = "Aprende Python desde cero.",
    duration: int = 60,
    credits: int = 2,
    status: str = Service.Status.ACTIVE,
    category: Category = None,
) -> Service:
    if category is None:
        category = make_category()
    return Service.objects.create(
        user=user,
        type=service_type,
        title=title,
        description=description,
        category=category,
        duration=duration,
        credits=credits,
        status=status,
    )

def make_trade(
    offerer: User,
    requester: User,
    service: Service = None,
    status: str = Trade.Status.PENDING,
    credits_amount: int = 2,
    days_ahead: int = 3,
    scheduled_date = None,
) -> Trade:
    if service is None:
        service = make_service(offerer, credits=credits_amount)
    if scheduled_date is None:
        scheduled_date = timezone.now() + timedelta(days=days_ahead)
    return Trade.objects.create(
        service=service,
        offerer=offerer,
        requester=requester,
        status=status,
        scheduled_date=scheduled_date,
        credits_amount=credits_amount,
    )


def make_completed_trade(offerer: User, requester: User, credits_amount: int = 2) -> Trade:
    service = make_service(offerer, credits=credits_amount)
    trade = Trade.objects.create(
        service=service,
        offerer=offerer,
        requester=requester,
        status=Trade.Status.COMPLETED,
        scheduled_date=timezone.now() - timedelta(days=1),
        credits_amount=credits_amount,
        completed_at=timezone.now(),
    )
    # Replicar lo que hace _transfer_credits en TradeStatusUpdateSerializer
    Transaction.objects.create(
        user=requester,
        trade=trade,
        amount=-credits_amount,
        transaction_type=Transaction.Type.DEBIT,
    )
    Transaction.objects.create(
        user=offerer,
        trade=trade,
        amount=credits_amount,
        transaction_type=Transaction.Type.CREDIT,
    )
    return trade

def make_conversation(*users) -> Conversation:
    conv = Conversation.objects.create()
    conv.participants.set(users)
    return conv


def make_message(conversation: Conversation, sender: User, content: str = "Hola!") -> Message:
    return Message.objects.create(
        conversation=conversation, sender=sender, content=content
    )

def make_review(
    trade: Trade,
    reviewer: User,
    reviewee: User,
    rating: int = 5,
    comment: str = "Excelente servicio, muy puntual y profesional.",
) -> Review:
    return Review.objects.create(
        trade=trade,
        reviewer=reviewer,
        reviewee=reviewee,
        rating=rating,
        comment=comment,
    )
