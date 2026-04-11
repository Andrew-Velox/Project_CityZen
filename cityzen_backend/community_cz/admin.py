from django.contrib import admin

from .models import ChatGroup, GroupMessage


@admin.register(ChatGroup)
class ChatGroupAdmin(admin.ModelAdmin):
	list_display = ("id", "group_name", "groupchat_name", "admin", "is_private", "created_at")
	search_fields = ("group_name", "groupchat_name", "admin__username")
	list_filter = ("is_private", "created_at")


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
	list_display = ("id", "group", "author", "delete_msg", "created")
	search_fields = ("group__group_name", "group__groupchat_name", "author__username", "body")
	list_filter = ("delete_msg", "created")
