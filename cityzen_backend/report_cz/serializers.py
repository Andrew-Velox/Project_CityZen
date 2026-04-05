from rest_framework import serializers

from .models import Comment, Report, ReportImage


class ReportSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.username", read_only=True)
    images = serializers.SerializerMethodField(read_only=True)
    upload_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        max_length=3,
    )

    class Meta:
        model = Report
        fields = [
            "id",
            "author",
            "title",
            "description",
            "category",
            "area",
            "location",
            "file",
            "images",
            "upload_images",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "status", "created_at", "updated_at"]

    def get_images(self, obj):
        return [image.image.url for image in obj.images.all()]

    def create(self, validated_data):
        upload_images = validated_data.pop("upload_images", [])
        report = Report.objects.create(**validated_data)

        for image in upload_images[:3]:
            ReportImage.objects.create(report=report, image=image)

        return report

    def update(self, instance, validated_data):
        upload_images = validated_data.pop("upload_images", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if upload_images is not None:
            instance.images.all().delete()
            for image in upload_images[:3]:
                ReportImage.objects.create(report=instance, image=image)

        return instance


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.username", read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(), required=False, allow_null=True, default=None
    )

    class Meta:
        model = Comment
        fields = ["id", "author", "report", "parent", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "report", "created_at", "updated_at"]
