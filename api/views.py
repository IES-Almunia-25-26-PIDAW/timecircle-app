from rest_framework.viewsets import ModelViewSet
from .models import Usuario
from .serializers import UsuarioSerializer
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

@extend_schema_view(
  list=extend_schema(summary="Listar usuarios", tags=["Usuarios"]),
  retrieve=extend_schema(summary="Obtener un usuario", tags=["Usuarios"]),
  create=extend_schema(summary="Crear usuario", tags=["Usuarios"]),
  update=extend_schema(summary="Actualizar usuario", tags=["Usuarios"]),
  partial_update=extend_schema(summary="Actualizar parcialmente usuario", tags=["Usuarios"]),
  destroy=extend_schema(summary="Eliminar usuario", tags=["Usuarios"]),
)
class UsuarioViewSet(ModelViewSet):
  queryset = Usuario.objects.all()
  serializer_class = UsuarioSerializer

  authentication_classes = [JWTAuthentication]
  permission_classes = [IsAuthenticated]
