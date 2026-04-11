from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .models import ChatGroup, GroupMessage
from .serializers import GroupMessageSerializer


class ChatGroupConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.group_id = int(self.scope["url_route"]["kwargs"]["group_id"])
        self.room_group_name = f"community_group_{self.group_id}"
        self.user = self.scope.get("user")

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.chat_group = await self._get_chat_group(self.group_id)
        if not self.chat_group:
            await self.close(code=4004)
            return

        if self.chat_group.is_private:
            is_member = await self._is_member(self.chat_group.id, self.user.id)
            if not is_member:
                await self.close(code=4003)
                return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self._mark_online(self.chat_group.id, self.user.id)
        await self._broadcast_online_update()

    async def disconnect(self, close_code):
        if getattr(self, "room_group_name", None):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        chat_group = getattr(self, "chat_group", None)
        user = getattr(self, "user", None)
        if chat_group and user and user.is_authenticated:
            await self._mark_offline(chat_group.id, user.id)
            await self._broadcast_online_update()

    async def receive_json(self, content, **kwargs):
        event = content.get("event")
        if event == "send_message":
            await self._handle_send_message(content)
            return

        if event == "mark_seen":
            message_id = content.get("message_id")
            if isinstance(message_id, int):
                await self._mark_seen(message_id, self.user.id)
            return

    async def _handle_send_message(self, content):
        body = (content.get("body") or "").strip()
        if not body:
            return

        if len(body) > 300:
            body = body[:300]

        message = await self._create_message(self.chat_group.id, self.user.id, body)
        message_payload = await self._serialize_message(message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "message_created",
                "message": message_payload,
            },
        )

    async def message_created(self, event):
        await self.send_json({"event": "message_created", "message": event["message"]})

    async def online_update(self, event):
        await self.send_json(
            {
                "event": "online_update",
                "group_id": self.group_id,
                "online_count": event["online_count"],
                "online_users": event["online_users"],
            }
        )

    async def message_deleted(self, event):
        await self.send_json(
            {
                "event": "message_deleted",
                "message_id": event["message_id"],
            }
        )

    async def _broadcast_online_update(self):
        online_users = await self._online_user_ids(self.chat_group.id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "online_update",
                "online_count": len(online_users),
                "online_users": online_users,
            },
        )

    @database_sync_to_async
    def _get_chat_group(self, group_id: int):
        try:
            return ChatGroup.objects.get(id=group_id)
        except ChatGroup.DoesNotExist:
            return None

    @database_sync_to_async
    def _is_member(self, group_id: int, user_id: int):
        return ChatGroup.objects.filter(id=group_id, members__id=user_id).exists()

    @database_sync_to_async
    def _mark_online(self, group_id: int, user_id: int):
        group = ChatGroup.objects.get(id=group_id)
        group.users_online.add(user_id)

    @database_sync_to_async
    def _mark_offline(self, group_id: int, user_id: int):
        group = ChatGroup.objects.get(id=group_id)
        group.users_online.remove(user_id)

    @database_sync_to_async
    def _online_user_ids(self, group_id: int):
        group = ChatGroup.objects.get(id=group_id)
        return list(group.users_online.values_list("id", flat=True))

    @database_sync_to_async
    def _create_message(self, group_id: int, user_id: int, body: str):
        message = GroupMessage.objects.create(group_id=group_id, author_id=user_id, body=body)
        message.seen_by.add(user_id)
        return message

    @database_sync_to_async
    def _mark_seen(self, message_id: int, user_id: int):
        try:
            message = GroupMessage.objects.get(id=message_id)
            message.seen_by.add(user_id)
        except GroupMessage.DoesNotExist:
            return

    @database_sync_to_async
    def _serialize_message(self, message: GroupMessage):
        serializer = GroupMessageSerializer(message)
        return serializer.data
