from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL


class Document(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rag_documents")
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)
    processing_error = models.TextField(blank=True, null=True)
    chunk_count = models.PositiveIntegerField(default=0)
    file_size = models.BigIntegerField(blank=True, null=True)
    content_type = models.CharField(max_length=120, blank=True, null=True)

    def __str__(self):
        return f"{self.title} uploaded by {self.user.get_username()}"

    def delete(self, *args, **kwargs):
        storage = self.file.storage
        file_name = self.file.name
        super().delete(*args, **kwargs)
        if file_name:
            storage.delete(file_name)

    class Meta:
        ordering = ["-uploaded_at"]


class QueryHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rag_queries")
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="queries",
    )
    query = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    top_k = models.PositiveSmallIntegerField(default=5)
    latency_ms = models.PositiveIntegerField(blank=True, null=True)

    def __str__(self):
        return f"{self.query[:50]}..."

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Query Histories"


class DocumentChunk(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    chunk_index = models.PositiveIntegerField()
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["document_id", "chunk_index"]
        unique_together = ("document", "chunk_index")
