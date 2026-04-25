from rest_framework import serializers
from .models import Document, QueryHistory
import os

class DocumentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'username', 'title', 'file', 'uploaded_at', 'processed']
        read_only_fields = ['username', 'uploaded_at', 'processed']



class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['file']
    
    def create(self, validated_data):
        uploaded_file = validated_data.get('file')
        title = os.path.splitext(uploaded_file.name)[0]
        return Document.objects.create(
            user=self.context['request'].user,
            title=title,
            file=uploaded_file
        )
    
    def validate_file(self, value):
        # More secure extension checking
        ext = os.path.splitext(value.name)[1].lower()  # Returns '.pdf', '.txt', etc.
        allowed_extensions = ['.pdf', '.txt', '.docx']
        
        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Only {', '.join(allowed_extensions)} files are allowed"
            )
        
        # File size validation
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 10MB")
        
        return value

class QuerySerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1000)

class QueryHistorySerializer(serializers.ModelSerializer):
    question = serializers.CharField(source='query')
    answer = serializers.CharField(source='response')

    class Meta:
        model = QueryHistory
        fields = ['id', 'query', 'response', 'answer', 'created_at', 'question']