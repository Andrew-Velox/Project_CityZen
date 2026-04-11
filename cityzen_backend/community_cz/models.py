import os
import uuid

from django.conf import settings
from django.db import models


class ChatGroup(models.Model):
	group_name = models.CharField(max_length=128, unique=True, default=uuid.uuid4)
	groupchat_name = models.CharField(max_length=128, null=True, blank=True)
	admin = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name="groupchats_administered",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
	)
	users_online = models.ManyToManyField(
		settings.AUTH_USER_MODEL,
		related_name="online_in_groups",
		blank=True,
	)
	members = models.ManyToManyField(
		settings.AUTH_USER_MODEL,
		related_name="chat_groups",
		blank=True,
	)
	is_private = models.BooleanField(default=False)
	banner = models.ImageField(upload_to="group_banners/", null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return self.groupchat_name or self.group_name

	@property
	def banner_url(self):
		if self.banner:
			return self.banner.url
		return None


class GroupMessage(models.Model):
	message_uuid = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
	group = models.ForeignKey(ChatGroup, related_name="chat_messages", on_delete=models.CASCADE)
	author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="group_messages", on_delete=models.CASCADE)
	body = models.CharField(max_length=300, blank=True, null=True)
	file = models.FileField(upload_to="community/files/", blank=True, null=True)
	voice_note = models.FileField(upload_to="community/voice_notes/", blank=True, null=True)
	duration = models.FloatField(blank=True, null=True)
	created = models.DateTimeField(auto_now_add=True)

	delete_msg = models.BooleanField(default=False)
	deleted_at = models.DateTimeField(null=True, blank=True)
	seen_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="seen_group_messages", blank=True)

	class Meta:
		ordering = ["-created"]
		indexes = [
			models.Index(fields=["group", "created"]),
			models.Index(fields=["author", "created"]),
		]

	@property
	def filename(self):
		if self.file:
			return os.path.basename(self.file.name)
		return None

	@property
	def is_image(self):
		filename = self.filename
		if not filename:
			return False
		return filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".svg", ".webp"))

	def __str__(self):
		author_name = getattr(self.author, "username", "unknown")

		if self.delete_msg:
			return f"{author_name}: [deleted]"
		if self.body:
			return f"{author_name}: {self.body[:20]}..."
		if self.voice_note:
			return f"{author_name}: [voice note]"
		if self.file:
			return f"{author_name}: {self.filename}"
		return f"{author_name}: [message]"
