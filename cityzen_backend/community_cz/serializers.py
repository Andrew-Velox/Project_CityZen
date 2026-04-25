from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ChatGroup, GroupMessage

User = get_user_model()


class ChatGroupSerializer(serializers.ModelSerializer):
    admin_username = serializers.CharField(source="admin.username", read_only=True)
    banner_url = serializers.SerializerMethodField(read_only=True)
    members = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=False)
    users_online = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=False)

    class Meta:
        model = ChatGroup
        fields = [
            "id",
            "group_name",
            "groupchat_name",
            "admin",
            "admin_username",
            "members",
            "users_online",
            "is_private",
            "banner",
            "banner_url",
            "created_at",
        ]
        read_only_fields = ["id", "admin", "admin_username", "banner_url", "created_at"]

    def get_banner_url(self, obj) -> str | None:
        if not obj.banner:
            return None

        request = self.context.get("request")
        if request is None:
            return obj.banner.url
        return request.build_absolute_uri(obj.banner.url)


class GroupMessageSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_image = serializers.SerializerMethodField(read_only=True)
    author_profile_url = serializers.SerializerMethodField(read_only=True)
    filename = serializers.ReadOnlyField()
    is_image = serializers.ReadOnlyField()
    seen_count = serializers.SerializerMethodField(read_only=True)
    is_seen_by_me = serializers.SerializerMethodField(read_only=True)
    seen_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, required=False)

    class Meta:
        model = GroupMessage
        fields = [
            "id",
            "message_uuid",
            "group",
            "author",
            "author_username",
            "author_image",
            "author_profile_url",
            "body",
            "file",
            "voice_note",
            "duration",
            "created",
            "delete_msg",
            "deleted_at",
            "seen_by",
            "seen_count",
            "is_seen_by_me",
            "filename",
            "is_image",
        ]
        read_only_fields = [
            "id",
            "message_uuid",
            "group",
            "author",
            "author_image",
            "author_profile_url",
            "created",
            "delete_msg",
            "deleted_at",
            "seen_count",
            "is_seen_by_me",
            "filename",
            "is_image",
        ]

    def get_seen_count(self, obj) -> int:
        return obj.seen_by.count()

    def get_is_seen_by_me(self, obj) -> bool:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.seen_by.filter(pk=user.pk).exists()

    def get_author_image(self, obj) -> str | None:
        image = getattr(obj.author, "image", None)
        if not image:
            return None

        try:
            if not image.storage.exists(image.name):
                return None
        except Exception:
            return None

        request = self.context.get("request")
        if request is None:
            return image.url
        return request.build_absolute_uri(image.url)

    def get_author_profile_url(self, obj) -> str | None:
        username = getattr(obj.author, "username", "")
        if not username:
            return None
        return f"/profile?user={username}"
