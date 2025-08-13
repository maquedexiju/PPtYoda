from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from django.views.decorators.http import require_POST

import base64
import json
from .models import Knowledge_Base

# 列出所有知识库
@login_required
def list_knowledge_bases(request):
    if request.method == 'POST':
        knowledge_bases = Knowledge_Base.objects.filter(user=request.user)
        data = [{
            'id': kb.id,
            'name': kb.name,
            'created_at': kb.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': kb.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        } for kb in knowledge_bases]
        return JsonResponse({'knowledge_bases': data}, status=200)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# check_name_available
@require_POST
def check_name_available(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')

        if not name:
            return JsonResponse({'error': 'name is required'}, status=400)

        # 检查名称是否已存在
        if Knowledge_Base.objects.filter(user=request.user, name=name).exists():
            return JsonResponse({'available': False}, status=200)

        return JsonResponse({'available': True}, status=200)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)

# 创建知识库
@login_required
@csrf_exempt
def create_knowledge_base(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            file_base64 = data.get('file')

            if not name or not file_base64:
                return JsonResponse({'error': 'name and file are required'}, status=400)

            # 检查名称是否已存在
            if Knowledge_Base.objects.filter(user=request.user, name=name).exists():
                return JsonResponse({'error': '知识库名称已存在'}, status=400)

            # 解码base64文件数据
            file_data = base64.b64decode(file_base64.split(',', 1)[1])
            file_name = f'{name}.db'

            # 创建知识库
            knowledge_base = Knowledge_Base.objects.create(
                name=name,
                user=request.user,
                file=ContentFile(file_data, name=file_name)
            )

            return JsonResponse({
                'id': knowledge_base.id,
                'name': knowledge_base.name,
                'message': 'Knowledge base created successfully'
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# 删除知识库
@login_required
def delete_knowledge_base(request, kb_id):

    knowledge_base = get_object_or_404(Knowledge_Base, id=kb_id, user=request.user)
    knowledge_base.file.delete(save=False)
    knowledge_base.delete()

    return JsonResponse({'message': '知识库删除成功'}, status=200)


# 修改知识库文件
@login_required
@csrf_exempt
def update_knowledge_base_file(request, kb_id):
    if request.method == 'PATCH':
        try:
            knowledge_base = get_object_or_404(Knowledge_Base, id=kb_id, user=request.user)
            data = json.loads(request.body)
            file_base64 = data.get('file')

            if not file_base64:
                return JsonResponse({'error': 'file is required'}, status=400)

            # 解码base64文件数据
            file_data = base64.b64decode(file_base64.split(',', 1)[1])
            file_name = f'{knowledge_base.name}.db'

            # 更新文件
            knowledge_base.file.save(file_name, ContentFile(file_data), save=True)

            return JsonResponse({
                'id': knowledge_base.id,
                'name': knowledge_base.name,
                'message': 'Knowledge base file updated successfully'
            }, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)
