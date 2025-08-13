from django.shortcuts import render
from django.http import JsonResponse
from .models import PPt_Template
import json

import io
import base64
from django.core.files.uploadedfile import InMemoryUploadedFile
import django.core.exceptions
from django.views.decorators.http import require_POST

# 列出所有当前用户的 ppt_template
def list_ppt_template(request):
    ppt_templates = PPt_Template.objects.filter(user=request.user).values('id', 'name', 'created_at')
    return JsonResponse({'ppt_templates': list(ppt_templates)})


# 检查模板名是否可用
@require_POST
def check_name_available(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    name = data.get('name')
    if PPt_Template.objects.filter(user=request.user, name=name).exists():
        return JsonResponse({'available': False})
    return JsonResponse({'available': True})

# 新增 ppt_template
def create_ppt_template(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except django.core.exceptions.RequestDataTooBig:
            return JsonResponse({'error': 'Request data size exceeds the limit'}, status=413)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)

        name = data.get('name')
        template_file_b64 = data.get('file')
        # 解码 base64 字符串
        print(type(template_file_b64))
        with open(f'tmp.pptx', 'wb') as f:
            f.write(base64.b64decode(template_file_b64.split(',')[1]))

        template_file = base64.b64decode(template_file_b64.split(',')[1])
        # 转换为字节流
        template_file = io.BytesIO(template_file)
        # 转换为 File 对象
        template_file = InMemoryUploadedFile(
            template_file,
            None,
            f'{name}.pptx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            template_file.getbuffer().nbytes,
            None
        )
        ppt_template = PPt_Template.objects.create(user=request.user, name=name, file=template_file)
        return JsonResponse({'id': ppt_template.id, 'name': ppt_template.name, 'created_at': str(ppt_template.created_at)})
    return JsonResponse({'error': 'Invalid request method'}, status=405)

# 删除 ppt_template
def delete_ppt_template(request, template_id):
    try:
        ppt_template = PPt_Template.objects.get(id=template_id, user=request.user)
        ppt_template.delete()
        return JsonResponse({'status': 'success'})
    except PPt_Template.DoesNotExist:
        return JsonResponse({'error': 'Template not found'}, status=404)


# 获取 template 的 sections
def get_template_sections(request, template_id):
    try:
        ppt_template = PPt_Template.objects.get(id=template_id, user=request.user)
        return JsonResponse({'sections': list(ppt_template.sections.keys())})
    except PPt_Template.DoesNotExist:
        return JsonResponse({'error': 'Template not found'}, status=404)