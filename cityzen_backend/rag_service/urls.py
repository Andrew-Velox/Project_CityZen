from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import *



router = DefaultRouter()
# router.register(r'documents', DocumentViewSet, basename='documents')
router.register(r'queries', QueryViewSet, basename='queries')

urlpatterns = [
    path('', include(router.urls)),
]
