from django.apps import AppConfig


class RagServiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'rag_service'

    def ready(self):
        import rag_service.signals  # Register signals