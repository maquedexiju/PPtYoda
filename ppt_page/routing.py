from django.urls import path
from . import consumers 

websocket_urlpatterns = [
    path('auto_doc_relations/', consumers.AutoDocRelations.as_asgi()),
    path('generate_full_text/', consumers.GenerateFullText.as_asgi()),
    path('generate_slide_data/', consumers.GenerateSlideData.as_asgi()),
    path('open_ai_helper/', consumers.StartFullTextAIHelper.as_asgi()),
]