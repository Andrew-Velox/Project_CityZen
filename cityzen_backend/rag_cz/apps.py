from django.apps import AppConfig


class RagCzConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rag_cz"

    def ready(self):
        from . import signals  # noqa: F401
