import json

from rest_framework import serializers

from .models import Comment, Report, ReportImage


class ReportSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author.username", read_only=True)
    images = serializers.SerializerMethodField(read_only=True)
    image_items = serializers.SerializerMethodField(read_only=True)
    upload_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        max_length=3,
    )
    image_slots = serializers.CharField(write_only=True, required=False)

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
            "image_items",
            "upload_images",
            "image_slots",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "status", "created_at", "updated_at"]

    def get_images(self, obj):
        urls = []
        for image in obj.images.all():
            if not image.image:
                continue
            if not image.image.storage.exists(image.image.name):
                continue
            urls.append(image.image.url)
        return urls

    def get_image_items(self, obj):
        items = []
        order = 1

        for image in obj.images.all():
            if not image.image:
                continue
            if not image.image.storage.exists(image.image.name):
                continue
            items.append({"id": image.id, "url": image.image.url, "order": order})
            order += 1

        return items

    def create(self, validated_data):
        upload_images = validated_data.pop("upload_images", [])
        validated_data.pop("image_slots", None)
        report = Report.objects.create(**validated_data)

        for image in upload_images[:3]:
            ReportImage.objects.create(report=report, image=image)

        return report

    def update(self, instance, validated_data):
        upload_images = validated_data.pop("upload_images", None)
        image_slots_raw = validated_data.pop("image_slots", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if image_slots_raw is not None:
            try:
                image_slots = json.loads(image_slots_raw)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({"image_slots": "Invalid JSON format."}) from exc

            if not isinstance(image_slots, list):
                raise serializers.ValidationError({"image_slots": "Expected a list of slots."})

            if len(image_slots) > 3:
                raise serializers.ValidationError({"image_slots": "Maximum 3 images are allowed."})

            existing_by_id = {image.id: image for image in instance.images.all()}
            uploaded_images = list(upload_images or [])
            uploaded_index = 0
            final_slots = []

            for slot in image_slots:
                if not isinstance(slot, dict):
                    raise serializers.ValidationError({"image_slots": "Each slot must be an object."})

                slot_kind = slot.get("kind")

                if slot_kind == "existing":
                    slot_id = slot.get("id")
                    if not isinstance(slot_id, int):
                        raise serializers.ValidationError(
                            {"image_slots": "Existing image slot must include integer id."}
                        )
                    existing_image = existing_by_id.get(slot_id)
                    if existing_image is None:
                        raise serializers.ValidationError(
                            {"image_slots": f"Image id {slot_id} does not belong to this report."}
                        )
                    final_slots.append(("existing", existing_image.image.name))
                elif slot_kind == "new":
                    if uploaded_index >= len(uploaded_images):
                        raise serializers.ValidationError(
                            {"image_slots": "Not enough uploaded images for new slots."}
                        )
                    final_slots.append(("new", uploaded_images[uploaded_index]))
                    uploaded_index += 1
                else:
                    raise serializers.ValidationError(
                        {"image_slots": "Slot kind must be 'existing' or 'new'."}
                    )

            if uploaded_index != len(uploaded_images):
                raise serializers.ValidationError(
                    {"upload_images": "Extra uploaded images do not match image slots."}
                )

            instance.images.all().delete()
            for slot_kind, image_value in final_slots:
                ReportImage.objects.create(report=instance, image=image_value)

            return instance

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
