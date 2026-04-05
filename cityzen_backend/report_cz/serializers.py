from rest_framework import serializers

from .models import Comment, Report


class ReportSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "author",
            "title",
            "description",
            "category",
            "area",
            "location",
            "file",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "status", "created_at", "updated_at"]


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.username", read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(), required=False, allow_null=True, default=None
    )

    class Meta:
        model = Comment
        fields = ["id", "author", "report", "parent", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "report", "created_at", "updated_at"]
