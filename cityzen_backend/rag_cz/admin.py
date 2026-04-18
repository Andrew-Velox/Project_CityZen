from django.contrib import admin

from .models import Document, DocumentChunk, QueryHistory


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "processed", "chunk_count", "uploaded_at")
    list_filter = ("processed", "uploaded_at")
    search_fields = ("title", "user__username", "user__email")


@admin.register(QueryHistory)
class QueryHistoryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "document", "top_k", "created_at")
    list_filter = ("created_at",)
    search_fields = ("query", "response", "user__username", "user__email")


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ("id", "document", "chunk_index", "created_at")
    list_filter = ("created_at",)
    search_fields = ("document__title", "document__user__username", "content")
