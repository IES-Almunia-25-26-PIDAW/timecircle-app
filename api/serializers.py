from rest_framework import serializers
from .models import *


# --------------------------
# USUARIO
# --------------------------
class UsuarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "dni", "fecha_nacimiento", "sexo",
            "first_name", "last_name", "is_active", "is_staff"
        ]


# --------------------------
# ETIQUETAS
# --------------------------
class EtiquetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etiqueta
        fields = "__all__"


# --------------------------
# HABILIDAD
# --------------------------
class HabilidadSerializer(serializers.ModelSerializer):
    etiquetas = EtiquetaSerializer(many=True, read_only=True)
    etiquetas_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Etiqueta.objects.all(),
        write_only=True
    )

    class Meta:
        model = Habilidad
        fields = ["id", "nombre", "descripcion", "etiquetas", "etiquetas_ids"]

    def create(self, validated_data):
        etiquetas_ids = validated_data.pop("etiquetas_ids", [])
        habilidad = Habilidad.objects.create(**validated_data)
        habilidad.etiquetas.set(etiquetas_ids)
        return habilidad

    def update(self, instance, validated_data):
        etiquetas_ids = validated_data.pop("etiquetas_ids", None)
        habilidad = super().update(instance, validated_data)

        if etiquetas_ids is not None:
            habilidad.etiquetas.set(etiquetas_ids)

        return habilidad


# --------------------------
# USUARIO - HABILIDAD (pivot)
# --------------------------
class UsuarioHabilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsuarioHabilidad
        fields = "__all__"


# --------------------------
# SERVICIOS
# --------------------------
class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = "__all__"


# --------------------------
# INTERCAMBIOS
# --------------------------
class IntercambioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Intercambio
        fields = "__all__"


# --------------------------
# TRANSACCIONES
# --------------------------
class TransaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaccion
        fields = "__all__"


# --------------------------
# MENSAJES
# --------------------------
class MensajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensaje
        fields = "__all__"
