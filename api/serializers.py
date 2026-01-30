from rest_framework import serializers
from .models import *


# --------------------------
# USUARIO
# --------------------------

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "dni", "birth_date", "gender",
            "first_name", "last_name", "is_active", "is_staff", "coins"
        ]


# --------------------------
# ETIQUETAS
# --------------------------
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = "__all__"


# --------------------------
# HABILIDAD
# --------------------------
class SkillSerializer(serializers.ModelSerializer):
   class Meta:
       model = Skill
       fields = "__all__"


# --------------------------
# USUARIO - HABILIDAD (pivot)
# --------------------------
class UserSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkill
        fields = "__all__"


# --------------------------
# SERVICIOS
# --------------------------
class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


# --------------------------
# INTERCAMBIOS
# --------------------------
class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = "__all__"


# --------------------------
# TRANSACCIONES
# --------------------------
class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"


# --------------------------
# MENSAJES
# --------------------------
class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = "__all__"
