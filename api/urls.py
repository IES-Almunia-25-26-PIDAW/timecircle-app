from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import *

router = DefaultRouter()
router.register("usuarios", UsuarioViewSet, basename="usuarios")
router.register("etiquetas", EtiquetaViewSet, basename="etiquetas")
router.register("habilidades", HabilidadViewSet, basename="habilidades")
router.register("usuario-habilidades", UsuarioHabilidadViewSet, basename="usuario-habilidades")
router.register("servicios", ServicioViewSet, basename="servicios")
router.register("intercambios", IntercambioViewSet, basename="intercambios")
router.register("transacciones", TransaccionViewSet, basename="transacciones")
router.register("mensajes", MensajeViewSet, basename="mensajes")

urlpatterns = [
    path("", include(router.urls)),
]
