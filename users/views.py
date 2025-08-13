from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie

import json

# 支持前端应用登录，根据输入的用户名、密码进行认证，并返回登录凭证
def user_login(request):
    """用户登录视图"""
    request_body = json.loads(request.body)
    username = request_body.get('username')
    password = request_body.get('password')
    
    if not username or not password:
        return JsonResponse({
            'status': 'error',
            'message': '用户名和密码不能为空'
        }, status=400)
    
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        # 确保会话已保存并生成sessionid
        if not request.session.session_key:
            request.session.save()
        return JsonResponse({
            'status': 'success',
            'message': '登录成功',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'sessionid': request.session.session_key
        })
    else:
        return JsonResponse({
            'status': 'error',
            'message': '用户名或密码错误'
        }, status=401)


# 支持前端应用登出，清除当前会话的登录状态
@require_POST
@csrf_protect
def user_logout(request):
    """用户登出视图"""
    if request.user.is_authenticated:
        logout(request)
        return JsonResponse({
            'status': 'success',
            'message': '登出成功'
        })
    else:
        return JsonResponse({
            'status': 'error',
            'message': '未登录'
        }, status=401)

@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})


# 获取当前用户的基本信息
@ensure_csrf_cookie
def get_user_info(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'status': 'success',
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
            }
        })
    else:
        return JsonResponse({
            'status': 'error',
            'message': '未登录'
        }, status=401)
