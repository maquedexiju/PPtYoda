from django.urls import path
from . import views

urlpatterns = [
    # 项目列表接口
    path('', views.list_projects, name='project_list'),
    # 项目详情接口
    path('<int:project_id>/', views.project_detail, name='project_detail'),
    # 创建项目接口
    # path('create/', views.create_project, name='create_project'),
    # 更新项目接口
    path('<int:project_id>/update/', views.update_project, name='update_project'),
    # 删除项目接口
    path('<int:project_id>/delete/', views.delete_project, name='delete_project'),
    # 改变项目阶段接口
    path('<int:project_id>/change_stage/', views.change_stage, name='change_stage'),

    # 更新项目材料任务接口
    path('<int:project_id>/material_tasks/update/', views.update_material_tasks, name='update_material_tasks'),
    # 生成材料文档数
    path('<int:project_id>/material_tasks/generate_doc_tree/', views.generate_doc_tree, name='generate_dc'),

    # 生成大纲
    # path('<int:project_id>/outline/generate/', views.generate_outline, name='generate_outline'),
    # 获取大纲
    path('<int:project_id>/outline/get/', views.get_outline, name='get_outline'),
    # 上传大纲
    path('<int:project_id>/outline/update/', views.update_outline, name='update_outline'),
    # 获取 PPT 模板的 sections
    path('<int:project_id>/ppt_template/get_sections/', views.get_ppt_template_sections, name='get_ppt_template_sections'),

    # PPT生成管理相关路由
    path('<int:project_id>/ppt_generation/status/', views.get_ppt_generation_status, name='get_ppt_generation_status'),
    path('<int:project_id>/ppt_generation/download_intermediate/', views.download_intermediate_file, name='download_intermediate_file'),
    path('<int:project_id>/ppt_generation/download_final/', views.download_final_file, name='download_final_file'),

]