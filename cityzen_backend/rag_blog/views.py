from django.shortcuts import render
from .models import BlogPost, Comment, Category
from .serializers import BlogPostSerializer, CommentSerializer,CategorySerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    
    

class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    # if user id passed in query params, filter by that user
    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[0-9]+)')
    def by_user(self, request, user_id=None):
        posts = BlogPost.objects.filter(author__id=user_id)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
    # if category id passed in query params, filter by that user
    @action(detail=False, methods=['get'], url_path='category/(?P<category_id>[0-9]+)')
    def by_category(self, request, category_id=None):
        posts = BlogPost.objects.filter(category__id=category_id)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionError("You do not have permission to update this post.")
        serializer.save()
        
    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise PermissionError("You do not have permission to delete this post.")
        instance.delete()


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        if slug:
            return Comment.objects.filter(post__slug=slug)
        return Comment.objects.all()

    def perform_create(self, serializer):
        slug = self.kwargs.get('slug')
        post = BlogPost.objects.get(slug=slug)
        serializer.save(author=self.request.user, post=post)
    
    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionError("You do not have permission to update this comment.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise PermissionError("You do not have permission to delete this comment.")
        instance.delete()

    