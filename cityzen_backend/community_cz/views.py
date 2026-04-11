from django.shortcuts import get_object_or_404
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import ChatGroup, GroupMessage
from .serializers import ChatGroupSerializer, GroupMessageSerializer


class ChatGroupViewSet(viewsets.ModelViewSet):
	queryset = ChatGroup.objects.select_related("admin").prefetch_related("members", "users_online").all()
	serializer_class = ChatGroupSerializer
	parser_classes = [MultiPartParser, FormParser, JSONParser]
	permission_classes = [IsAuthenticatedOrReadOnly]

	def perform_create(self, serializer):
		if not self.request.user.is_staff:
			raise PermissionDenied("Only admin users can create groups.")
		group = serializer.save(admin=self.request.user)
		group.members.add(self.request.user)

	@action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
	def join(self, request, pk=None):
		group = self.get_object()
		group.members.add(request.user)
		return Response({"detail": "Joined group successfully."})

	@action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
	def leave(self, request, pk=None):
		group = self.get_object()
		group.members.remove(request.user)
		group.users_online.remove(request.user)
		return Response({"detail": "Left group successfully."})

	@action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
	def mark_online(self, request, pk=None):
		group = self.get_object()
		if not group.members.filter(pk=request.user.pk).exists():
			raise PermissionDenied("You must be a member to be marked online.")
		group.users_online.add(request.user)
		return Response({"detail": "User marked online."})

	@action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
	def mark_offline(self, request, pk=None):
		group = self.get_object()
		group.users_online.remove(request.user)
		return Response({"detail": "User marked offline."})


class GroupMessageViewSet(viewsets.ModelViewSet):
	queryset = GroupMessage.objects.select_related("author", "group").all()
	serializer_class = GroupMessageSerializer
	parser_classes = [MultiPartParser, FormParser, JSONParser]
	permission_classes = [IsAuthenticatedOrReadOnly]

	def get_queryset(self):
		group_id = self.kwargs.get("group_id")
		queryset = GroupMessage.objects.select_related("author", "group")
		if group_id:
			group = get_object_or_404(ChatGroup, id=group_id)
			if group.is_private and not group.members.filter(pk=self.request.user.pk).exists():
				raise PermissionDenied("You must be a member to view messages in this private group.")
			queryset = queryset.filter(group_id=group_id)
		return queryset

	def perform_create(self, serializer):
		group_id = self.kwargs.get("group_id")
		group = get_object_or_404(ChatGroup, id=group_id)

		is_member = group.members.filter(pk=self.request.user.pk).exists()
		if group.is_private and not is_member:
			raise PermissionDenied("You must be a member to send messages in this private group.")

		message = serializer.save(author=self.request.user, group=group)
		message.seen_by.add(self.request.user)

	def perform_update(self, serializer):
		if serializer.instance.author != self.request.user:
			raise PermissionDenied("You do not have permission to update this message.")
		serializer.save()

	def perform_destroy(self, instance):
		if instance.author != self.request.user:
			raise PermissionDenied("You do not have permission to delete this message.")
		instance.delete()

	@action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
	def soft_delete(self, request, group_id=None, pk=None):
		message = self.get_object()
		if message.author != request.user:
			raise PermissionDenied("You do not have permission to delete this message.")

		message.delete_msg = True
		message.deleted_at = timezone.now()
		message.body = None
		message.save(update_fields=["delete_msg", "deleted_at", "body"])

		channel_layer = get_channel_layer()
		if channel_layer:
			async_to_sync(channel_layer.group_send)(
				f"community_group_{message.group_id}",
				{
					"type": "message_deleted",
					"message_id": message.id,
				},
			)
		return Response({"detail": "Message marked as deleted."})

	@action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedOrReadOnly])
	def mark_seen(self, request, group_id=None, pk=None):
		message = self.get_object()
		message.seen_by.add(request.user)
		return Response({"detail": "Message marked as seen."})
