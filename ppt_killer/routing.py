from channels.routing import URLRouter
from django.urls import path

import project_manage.routing
import ppt_page.routing
import materials.routing

websocket_urlpatterns = [
    # /api/projects 由 project_manage 下的 routing 处理
    path('api/projects/', URLRouter(project_manage.routing.websocket_urlpatterns)),
    path('api/slide/', URLRouter(ppt_page.routing.websocket_urlpatterns)),
    path('api/materials/', URLRouter(materials.routing.websocket_urlpatterns)),
]