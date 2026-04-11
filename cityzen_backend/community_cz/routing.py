from django.urls import path

from .consumer import ChatGroupConsumer

websocket_urlpatterns = [
    path("ws/community/groups/<int:group_id>/", ChatGroupConsumer.as_asgi()),
]
