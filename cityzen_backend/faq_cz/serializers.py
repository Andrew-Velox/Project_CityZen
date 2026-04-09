from rest_framework import serializers

from .models import Faq


class FaqSerializer(serializers.ModelSerializer):
    class Meta:
        model = Faq
        fields = ["id", "question", "answer", "category", "order", "is_active", "created_at", "updated_at"]
