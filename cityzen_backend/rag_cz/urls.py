from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DocumentViewSet, QueryHistoryViewSet

router = DefaultRouter()
router.register(r"documents", DocumentViewSet, basename="rag-document")
router.register(r"queries", QueryHistoryViewSet, basename="rag-query")

urlpatterns = [
    path("", include(router.urls)),
]
