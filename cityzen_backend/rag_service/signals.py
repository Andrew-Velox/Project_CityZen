from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Document
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Document)
def process_document_on_save(sender, instance, created, **kwargs):
    """Auto-process documents when uploaded via API or admin panel."""
    if created and not instance.processed:
        try:
            from .views import get_rag_service
            
            result = get_rag_service().process_document(instance.file.path)
            
            if result:
                instance.processed = True
                instance.save(update_fields=['processed'])
                logger.info(f"Document {instance.id} processed successfully")
            else:
                logger.warning(f"Document {instance.id} processing failed")
        except Exception as e:
            logger.error(f"Error processing document {instance.id}: {e}")