from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, ReportViewSet

router = DefaultRouter()
router.register(r"reports", ReportViewSet, basename="report")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "reports/<int:report_id>/comments/",
        CommentViewSet.as_view({"get": "list", "post": "create"}),
        name="report-comment-list",
    ),
    path(
        "reports/<int:report_id>/comments/<int:pk>/",
        CommentViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="report-comment-detail",
    ),
]
