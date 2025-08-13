from django.urls import path
from . import views

urlpatterns = [
    # 列出所有知识库
    path('list/', views.list_knowledge_bases, name='list_knowledge_bases'),
    # 创建知识库
    path('create/', views.create_knowledge_base, name='create_knowledge_base'),
    # 删除知识库
    path('delete/<int:kb_id>/', views.delete_knowledge_base, name='delete_knowledge_base'),
    # 更新知识库文件
    path('update_file/<int:kb_id>/', views.update_knowledge_base_file, name='update_knowledge_base_file'),
    # 检查知识库名是否可用
    path('check_name_available/', views.check_name_available, name='check_name_available'),
]