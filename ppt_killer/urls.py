"""
URL configuration for ppt_killer project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # 暂时注释掉项目管理模块路由以解决错误
    path('api/projects/', include('project_manage.urls')),
    path("api/materials/", include("materials.urls")), # 材料管理模块
    path("api/slide/", include("ppt_page.urls")), # 页面管理模块
    path('api/knowledge_base/', include('knowledge_base.urls')),
    path("api/users/", include("users.urls")), # 用户认证模块
    path("api/ppt_template/", include("ppt_template.urls")), # ppt模板管理模块
    path("api/project_template/", include("project_template.urls")), # 工程模板管理模块
]
