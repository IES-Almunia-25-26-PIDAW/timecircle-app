"""
TimeCircle — rutas de la API (api/)

Auth endpoints (sin prefijo de router):
  POST   /api/auth/register/
  POST   /api/auth/login/
  POST   /api/auth/refresh/
  GET    /api/auth/me/
  PATCH  /api/auth/me/
  POST   /api/auth/logout/

Presencia (tiempo real via polling):
  POST   /api/presence/heartbeat/   → heartbeat + status (online|away)
  POST   /api/presence/typing/      → indicar que estoy escribiendo
  GET    /api/presence/             → consultar presencia de otro usuario

Router endpoints:
  /api/users/                  → UserViewSet
  /api/users/ranking/
  /api/users/{id}/services/
  /api/users/{id}/reviews/
  /api/users/skills/
  /api/users/transactions/
  /api/users/activity/

  /api/categories/
  /api/tags/
  /api/skills/
  /api/services/
  /api/trades/
  /api/trades/{id}/status/
  /api/conversations/
  /api/conversations/{id}/messages/
  /api/conversations/{id}/read/
  /api/reviews/

  /contact/

  /api/admin/stats/
  /api/admin/users/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView, RegisterView, MeView, LogoutView,
  WSPresenceHandshakeView,
    UserViewSet, CategoryViewSet, TagViewSet, SkillViewSet,
    ServiceViewSet, TradeViewSet,
    ConversationViewSet, ReviewViewSet,
    AdminStatsView, AdminUserViewSet, ContactView,
    # Presencia — añadir al import de views.py
    PresenceHeartbeatView, PresenceTypingView, PresenceStatusView,
    RequestPasswordResetView, ConfirmPasswordResetView,
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
    path('auth/register/', RegisterView.as_view(),      name='auth-register'),
    path('auth/login/',    LoginView.as_view(),          name='auth-login'),
    path('auth/refresh/',  TokenRefreshView.as_view(),   name='auth-refresh'),
    path('auth/me/',       MeView.as_view(),             name='auth-me'),
    path('auth/logout/',   LogoutView.as_view(),         name='auth-logout'),
    path('auth/ws-handshake/', WSPresenceHandshakeView.as_view(), name='auth-ws-handshake'),
    path('auth/request-password-reset/', RequestPasswordResetView.as_view(), name='auth-request-password-reset'),
    path('auth/confirm-password-reset/', ConfirmPasswordResetView.as_view(), name='auth-confirm-password-reset'),

    # Presencia en tiempo real (polling)
    path('presence/heartbeat/', PresenceHeartbeatView.as_view(), name='presence-heartbeat'),
    path('presence/typing/',    PresenceTypingView.as_view(),     name='presence-typing'),
    path('presence/',           PresenceStatusView.as_view(),     name='presence-status'),

    # Contacto (público)
    path('contact/', ContactView.as_view(), name='contact'),

    # Admin stats
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),

    # Router
    path('', include(router.urls)),
]