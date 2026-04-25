from django.db import models
from django.conf import settings
import os
# Create your models here.

User = settings.AUTH_USER_MODEL


class Document(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed = models.BooleanField(default=False)




    def __str__(self):
        return f"{self.title} uploaded by {self.user.username}"
    
    def delete(self , *args, **kwargs):
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['-uploaded_at']


class QueryHistory(models.Model):
    query = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.query[:50]}..."


    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Query Histories"