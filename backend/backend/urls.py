"""
TimeCircle — URL raíz del proyecto Django.

Rutas disponibles:
  /django-admin/          → Panel de administración de Django
  /api/                   → API REST (ver api/urls.py para el detalle)
  /api/schema/            → Esquema OpenAPI (JSON/YAML) — drf-spectacular
  /api/docs/              → Swagger UI (interfaz interactiva)
  /api/redoc/             → ReDoc (documentación alternativa)
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Panel admin de Django
    path('django-admin/', admin.site.urls),

    # API REST
    path('api/', include('api.urls')),

    # OpenAPI / Swagger
    path('api/schema/', SpectacularAPIView.as_view(),  name='schema'),
    path(
        'api/docs/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
    path(
        'api/redoc/',
        SpectacularRedocView.as_view(url_name='schema'),
        name='redoc',
    ),
]
