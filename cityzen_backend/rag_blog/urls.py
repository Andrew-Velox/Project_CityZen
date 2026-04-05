# urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import *

router = DefaultRouter()
router.register(r'posts', BlogPostViewSet, basename='blogpost')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
    
    path('posts/<slug:slug>/comments/', 
         CommentViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='comment-list'),
    
    path('posts/<slug:slug>/comments/<int:pk>/', 
         CommentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), 
         name='comment-detail'),
]