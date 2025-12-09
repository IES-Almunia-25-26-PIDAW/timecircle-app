# api/urls.py
from .routers import router
from django.urls import include, path

urlpatterns = [
    path('', include(router.urls)),
]