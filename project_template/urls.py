from django.urls import path
from .views import get_project_template_list
# 解析到 get_project_template_list

urlpatterns = [
    path('list/', get_project_template_list, name='get_project_template_list'),
]
