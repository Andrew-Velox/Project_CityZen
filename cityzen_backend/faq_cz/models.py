from django.db import models


class Faq(models.Model):
    class Category(models.TextChoices):
        GENERAL = "general", "General"
        ACCOUNT = "account", "Account"
        REPORTING = "reporting", "Reporting"
        COMMUNITY = "community", "Community"
        TECHNICAL = "technical", "Technical"

    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["is_active", "order"]),
            models.Index(fields=["category", "is_active", "order"]),
        ]

    def __str__(self):
        return self.question
