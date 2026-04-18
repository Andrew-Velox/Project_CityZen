from rest_framework import serializers

from .models import Document, QueryHistory


class DocumentSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "user",
            "title",
            "file",
            "uploaded_at",
            "processed",
            "processing_error",
            "chunk_count",
            "file_size",
            "content_type",
        ]
        read_only_fields = [
            "id",
            "user",
            "uploaded_at",
            "processed",
            "processing_error",
            "chunk_count",
            "file_size",
            "content_type",
        ]


class QueryHistorySerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = QueryHistory
        fields = [
            "id",
            "user",
            "document",
            "query",
            "response",
            "created_at",
            "top_k",
            "latency_ms",
        ]
        read_only_fields = ["id", "user", "created_at"]
