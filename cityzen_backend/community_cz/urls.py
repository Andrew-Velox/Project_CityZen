from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatGroupViewSet, GroupMessageViewSet

router = DefaultRouter()
router.register(r"groups", ChatGroupViewSet, basename="community-group")

urlpatterns = [
	path("", include(router.urls)),
	path(
		"groups/<int:group_id>/messages/",
		GroupMessageViewSet.as_view({"get": "list", "post": "create"}),
		name="group-message-list",
	),
	path(
		"groups/<int:group_id>/messages/<int:pk>/",
		GroupMessageViewSet.as_view(
			{
				"get": "retrieve",
				"put": "update",
				"patch": "partial_update",
				"delete": "destroy",
			}
		),
		name="group-message-detail",
	),
	path(
		"groups/<int:group_id>/messages/<int:pk>/soft-delete/",
		GroupMessageViewSet.as_view({"post": "soft_delete"}),
		name="group-message-soft-delete",
	),
	path(
		"groups/<int:group_id>/messages/<int:pk>/mark-seen/",
		GroupMessageViewSet.as_view({"post": "mark_seen"}),
		name="group-message-mark-seen",
	),
]
