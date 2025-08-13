from django.urls import path
from . import views

urlpatterns = [
    path('task/<int:task_id>/documents/', views.get_documents_by_task),
    path('task/<int:task_id>/create_document/', views.create_document),
    # path('task/<int:task_id>/call_ai_tools/', views.call_ai_tools),
    path('document/<int:document_id>/', views.get_document_content),
    path('document/<int:document_id>/update/', views.update_document),
    path('document/<int:document_id>/delete/', views.delete_document),

    path('task/<int:task_id>/add_file/', views.add_file_to_task),
]