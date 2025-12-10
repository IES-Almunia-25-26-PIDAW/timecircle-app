from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import *
from .serializers import (
    UsuarioSerializer, EtiquetaSerializer, HabilidadSerializer,
    UsuarioHabilidadSerializer, ServicioSerializer, IntercambioSerializer,
    TransaccionSerializer, MensajeSerializer
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
# USUARIO
# ----------------------
@documented_viewset
class UsuarioViewSet(ModelViewSet):
    basename = "usuarios"
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# ETIQUETA
# ----------------------
@documented_viewset
class EtiquetaViewSet(ModelViewSet):
    basename = "etiquetas"
    queryset = Etiqueta.objects.all()
    serializer_class = EtiquetaSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# HABILIDAD
# ----------------------
@documented_viewset
class HabilidadViewSet(ModelViewSet):
    basename = "habilidades"
    queryset = Habilidad.objects.all()
    serializer_class = HabilidadSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# USUARIO - HABILIDAD
# ----------------------
@documented_viewset
class UsuarioHabilidadViewSet(ModelViewSet):
    basename = "usuario-habilidades"
    queryset = UsuarioHabilidad.objects.all()
    serializer_class = UsuarioHabilidadSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# SERVICIO
# ----------------------
@documented_viewset
class ServicioViewSet(ModelViewSet):
    basename = "servicios"
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# INTERCAMBIO
# ----------------------
@documented_viewset
class IntercambioViewSet(ModelViewSet):
    basename = "intercambios"
    queryset = Intercambio.objects.all()
    serializer_class = IntercambioSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# TRANSACCION
# ----------------------
@documented_viewset
class TransaccionViewSet(ModelViewSet):
    basename = "transacciones"
    queryset = Transaccion.objects.all()
    serializer_class = TransaccionSerializer
    permission_classes = [IsAuthenticated]


# ----------------------
# MENSAJE
# ----------------------
@documented_viewset
class MensajeViewSet(ModelViewSet):
    basename = "mensajes"
    queryset = Mensaje.objects.all()
    serializer_class = MensajeSerializer
    permission_classes = [IsAuthenticated]
