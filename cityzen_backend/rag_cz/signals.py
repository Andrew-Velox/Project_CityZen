import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Document
from .services import RAGService


logger = logging.getLogger(__name__)


@receiver(post_save, sender=Document)
def process_document_on_save(sender, instance, created, **kwargs):
    """Auto-process new documents when enabled."""
    if not created:
        return

    if instance.processed:
        return

    if not getattr(settings, "RAG_AUTO_PROCESS_ON_UPLOAD", True):
        return

    try:
        service = RAGService(user_id=instance.user_id)
        result = service.process_document(instance)

        instance.processed = result.get("ok", False)
        instance.chunk_count = result.get("chunk_count", 0)
        instance.processing_error = result.get("error") or ""
        instance.save(update_fields=["processed", "chunk_count", "processing_error"])

        if instance.processed:
            logger.info("Document %s processed successfully", instance.id)
        else:
            logger.warning("Document %s processing failed: %s", instance.id, instance.processing_error)
    except Exception as exc:
        logger.error("Error processing document %s: %s", instance.id, exc)
        instance.processed = False
        instance.processing_error = str(exc)
        instance.save(update_fields=["processed", "processing_error"])
