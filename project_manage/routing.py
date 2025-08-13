from django.urls import path
from . import consumers 

websocket_urlpatterns = [
    path('create/', consumers.CreateProject.as_asgi()),
    # path('generate_outline/', consumers.GenerateOutline.as_asgi())
    path('generate_outline/', consumers.GenerateOutline.as_asgi()),
    path('auto_doc_relations/', consumers.AutoDocRelations.as_asgi()),
    path('generate_full_text/', consumers.GenerateFullText.as_asgi()),
    path('generate_slide_data/', consumers.GenerateSlideData.as_asgi()),

    path('generate_ppt/', consumers.GeneratePPT.as_asgi()),
    path('multimedia_processing/', consumers.MultimediaProcessing.as_asgi()),
    path('generate_final_ppt/', consumers.GenerateFinalPPT.as_asgi()),
    path('download_final_ppt/', consumers.DownloadFinalPPT.as_asgi()),
]