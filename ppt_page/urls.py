from django.urls import path
from . import views

urlpatterns = [
    # 根据上传的 name 和 desc 修改 name 及 description
    # 目前不提供，还是通过 sync 来全量同步
    # path('<int:page_id>/update/', views.update_ppt_page, name='update_ppt_page'),
    
    # 根据 id 生成 prompt
    path('<int:page_id>/generate_prompt/', views.generate_prompt, name='generate_prompt'),
    
    # 根据 id 返回关联的 doc 列表
    path('<int:page_id>/related_docs/', views.get_related_docs, name='get_related_docs'),
    # 根据 post 的 document id 生成关联
    path('<int:page_id>/create_doc_relation/', views.create_doc_relation, name='create_doc_relation'),
    # 根据 post 的 document id 删除关联
    path('<int:page_id>/delete_doc_relation/', views.delete_doc_relation, name='delete_doc_relation'),

    # 获取全文
    path('<int:page_id>/get_full_text/', views.get_full_text, name='get_full_text'),
    # 保存大纲
    path('<int:page_id>/save_full_text/', views.save_full_text, name='save_full_text'),

    # 获取 slide data
    path('<int:page_id>/get_slide_data/', views.get_slide_data, name='get_slide_data'),
    # 保存 slide data
    path('<int:page_id>/save_slide_data/', views.save_slide_data, name='save_slide_data'),

    # 获取 quote info
    path('<int:page_id>/get_quoted_info/', views.get_quoted_info, name='get_quote_info'),
    # 保存 quote info
    path('<int:page_id>/save_quoted_info/', views.save_quoted_info, name='save_quote_info'),

    # 获取可用的 slide_templates
    path('<int:page_id>/get_available_slide_templates/', views.get_available_slide_templates, name='get_available_slide_templates'),
    # 变更 ppt_page 对应 page_and_template 的 template_id
    path('<int:page_id>/change_template/', views.change_template, name='change_template'),

]