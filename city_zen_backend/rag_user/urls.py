from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import *



router = DefaultRouter()
# router.register(r'list', UserViewSet, basename='users')      # will be /user/list/
router.register(r'register', RegistrationViewSet, basename='register')  # will be /user/register/
# router.register(r'profile', ProfileViewSet, basename='profile')  # will be /user/profile/
router.register(r'account', ProfileDeleteViewSet, basename='account')  # will be /user/account/

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegistrationViewSet.as_view({'post': 'create'}), name='user-register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh-token/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileViewSet.as_view({'get': 'list'}), name='user-profile'),
    path('profile/update/<int:pk>/', UserUpdateViewSet.as_view({ 'patch': 'partial_update'}), name='user-profile-update'),
    path('change-password/<int:pk>/', PasswordChangeViewSet.as_view({'post': 'create'}), name='change-password'),
    # path('delete-profile/<int:pk>/', ProfileDeleteViewSet.as_view({'delete': 'destroy'}), name='delete-profile'),


    path('account/active/<uid64>/<token>/', activate, name='activate'),
    
]