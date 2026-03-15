"""
TimeCircle — rutas de la API (api/)

Todas las rutas tienen el prefijo /api/ (configurado en backend/urls.py).

Auth endpoints (sin prefijo de router):
  POST   /api/auth/register/          → Registro
  POST   /api/auth/login/             → Login JWT
  POST   /api/auth/refresh/           → Refresh token
  GET    /api/auth/me/                → Perfil propio
  PATCH  /api/auth/me/                → Actualizar perfil
  POST   /api/auth/logout/            → Logout (blacklist)

Router endpoints:
  /api/users/                  → UserViewSet
  /api/users/ranking/          → Ranking
  /api/users/{id}/services/    → Servicios de un usuario
  /api/users/{id}/reviews/     → Reseñas recibidas por un usuario
  /api/users/skills/           → Habilidades del usuario autenticado
  /api/users/transactions/     → Historial de créditos del usuario autenticado
  /api/users/activity/         → Actividad mensual del usuario autenticado

  /api/categories/             → CategoryViewSet (solo lectura)
  /api/tags/                   → TagViewSet (solo lectura)
  /api/skills/                 → SkillViewSet

  /api/services/               → ServiceViewSet
  /api/trades/                 → TradeViewSet
  /api/trades/{id}/status/     → Cambiar estado del Trade

  /api/conversations/                    → ConversationViewSet
  /api/conversations/{id}/messages/      → Enviar mensaje
  /api/conversations/{id}/read/          → Marcar como leídos

  /api/reviews/                → ReviewViewSet

Admin endpoints:
  GET    /api/admin/stats/              → Estadísticas globales
  GET    /api/admin/users/              → Listado de usuarios
  PATCH  /api/admin/users/{id}/         → Editar usuario
  DELETE /api/admin/users/{id}/         → Desactivar usuario
  PATCH  /api/admin/users/{id}/activate/ → Reactivar usuario
  GET    /api/admin/users/{id}/stats/   → Stats individuales

Documentación Swagger:
  GET    /api/schema/   → OpenAPI schema (JSON/YAML)
  GET    /api/docs/     → Swagger UI
  GET    /api/redoc/    → ReDoc
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, RegisterView, MeView, LogoutView,
    UserViewSet, CategoryViewSet, TagViewSet, SkillViewSet,
    ServiceViewSet, TradeViewSet,
    ConversationViewSet, ReviewViewSet,
    AdminStatsView, AdminUserViewSet,
)

# ── Router principal ──────────────────────────────────────
router = DefaultRouter()
router.register(r'users',         UserViewSet,         basename='user')
router.register(r'categories',    CategoryViewSet,     basename='category')
router.register(r'tags',          TagViewSet,          basename='tag')
router.register(r'skills',        SkillViewSet,        basename='skill')
router.register(r'services',      ServiceViewSet,      basename='service')
router.register(r'trades',        TradeViewSet,        basename='trade')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'reviews',       ReviewViewSet,       basename='review')
router.register(r'admin/users',   AdminUserViewSet,    basename='admin-user')

# ── URL patterns ──────────────────────────────────────────
urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(),  name='auth-register'),
    path('auth/login/',    LoginView.as_view(),     name='auth-login'),
    path('auth/refresh/',  TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/',       MeView.as_view(),        name='auth-me'),
    path('auth/logout/',   LogoutView.as_view(),    name='auth-logout'),

    # Admin stats (fuera del router para evitar conflicto con el prefijo admin/users)
    path('admin/stats/',   AdminStatsView.as_view(), name='admin-stats'),

    # Router
    path('', include(router.urls)),
]
