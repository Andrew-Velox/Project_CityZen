from django.contrib import admin

from .models import Faq


@admin.register(Faq)
class FaqAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "category", "order", "is_active", "updated_at")
    list_filter = ("category", "is_active")
    search_fields = ("question", "answer")
    ordering = ("order", "id")
