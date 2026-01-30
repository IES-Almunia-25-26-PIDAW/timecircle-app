from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import *
from .serializers import (
    UserSerializer, TagSerializer, SkillSerializer,
    UserSkillSerializer, ServiceSerializer, TradeSerializer,
    TransactionSerializer, MessageSerializer
)


# Helper para documentar automáticamente
def documented_viewset(cls):
    return extend_schema_view(
        list=extend_schema(summary=f"Listar {cls.basename}"),
        retrieve=extend_schema(summary=f"Obtener {cls.basename[:-1]}"),
        create=extend_schema(summary=f"Crear {cls.basename[:-1]}"),
        update=extend_schema(summary=f"Actualizar {cls.basename[:-1]}"),
        partial_update=extend_schema(summary=f"Actualizar parcialmente {cls.basename[:-1]}"),
        destroy=extend_schema(summary=f"Eliminar {cls.basename[:-1]}")
    )(cls)


# ----------------------
# User
# ----------------------
@documented_viewset
class UserViewSet(ModelViewSet):
    basename = "Users"
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# Tag
# ----------------------
@documented_viewset
class TagViewSet(ModelViewSet):
    basename = "Tags"
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# Skill
# ----------------------
@documented_viewset
class SkillViewSet(ModelViewSet):
    basename = "Skills"
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# User - Skill
# ----------------------
@documented_viewset
class UserSkillViewSet(ModelViewSet):
    basename = "User-Skills"
    queryset = UserSkill.objects.all()
    serializer_class = UserSkillSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# Service
# ----------------------
@documented_viewset
class ServiceViewSet(ModelViewSet):
    basename = "Services"
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# Trade
# ----------------------
@documented_viewset
class TradeViewSet(ModelViewSet):
    basename = "Trades"
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# Transaction
# ----------------------
@documented_viewset
class TransactionViewSet(ModelViewSet):
    basename = "Transactions"
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# Message
# ----------------------
@documented_viewset
class MessageViewSet(ModelViewSet):
    basename = "Messages"
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
