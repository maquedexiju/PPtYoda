from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('csrf/', views.get_csrf_token, name='get_csrf_token'),
    path('user_info/', views.get_user_info, name='get_user_info'),
]