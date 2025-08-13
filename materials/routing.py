from django.urls import path
from . import consumers 

websocket_urlpatterns = [
    path('start_ai_helper/', consumers.StartAIHelper.as_asgi()),
]