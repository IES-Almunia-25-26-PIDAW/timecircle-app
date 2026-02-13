from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import *

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("tags", TagViewSet, basename="tags")
router.register("skills", SkillViewSet, basename="skills")
router.register("user-skills", UserSkillViewSet, basename="user-skills")
router.register("services", ServiceViewSet, basename="services")
router.register("trades", TradeViewSet, basename="trades")
router.register("transactions", TransactionViewSet, basename="transactions")
router.register("messages", MessageViewSet, basename="message")
router.register("ratings", RatingViewSet, basename="ratings")

urlpatterns = [
    path("", include(router.urls)),
]
