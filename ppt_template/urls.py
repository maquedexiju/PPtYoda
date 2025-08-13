# 增加列出 ppt_template 的 url
from django.urls import path
from . import views

urlpatterns = [
    # 列出所有当前用户的 ppt_template
    path('list/', views.list_ppt_template, name='list_ppt_template'),
    # 新增 ppt_template
    path('create/', views.create_ppt_template, name='create_ppt_template'),
    # 删除 ppt_template
    path('delete/<int:template_id>/', views.delete_ppt_template, name='delete_ppt_template'),
    # 检查模板名是否可用
    path('check_name_available/', views.check_name_available, name='check_name_available'),
    # 获取 template 的 sections
    path('get_sections/<int:template_id>/', views.get_template_sections, name='get_template_sections'),
]