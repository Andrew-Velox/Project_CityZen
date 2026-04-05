from .models import BlogPost, Comment, Category
from rest_framework import serializers


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id', 'slug','name']

class BlogPostSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = BlogPost
        fields = ['id', 'author', 'title', 'featured_image', 'category', 'content', 'slug', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'slug', 'author']





class CommentSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source='author.username', read_only=True)
    parent = serializers.PrimaryKeyRelatedField(queryset=Comment.objects.all(), 
    required=False, 
    allow_null=True,
    default=None,
    )

    class Meta:
        model = Comment
        fields = ['id', 'author', 'post', 'parent', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'author', 'post']


