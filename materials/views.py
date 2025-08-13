from django.shortcuts import render
from django.http import JsonResponse, Http404, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from .models import Material_Task, Document
from django.views.decorators.http import require_http_methods
import json
from .tools.web_browser import Web_Browser
import os

# 1. 根据 material_task id，查询对应任务是否属于当前用户，并获取相关 Document 并返回 json
@login_required
@require_http_methods(['POST'])
def get_documents_by_task(request, task_id):
    try:
        # 获取任务并检查权限
        task = Material_Task.objects.get(id=task_id)
        if task.project.user != request.user:
            return HttpResponseForbidden({
                'error': '无权限访问此任务'
            }, content_type='application/json')

        # 获取相关文档
        documents = Document.objects.filter(task=task)
        document_list = [{
            'id': doc.id,
            'name': doc.name,
        } for doc in documents]

        return JsonResponse({
            'task_id': task_id,
            'documents': document_list
        })

    except Material_Task.DoesNotExist:
        raise Http404({
            'error': '任务不存在'
        })

# 2. 根据 Document id ，查询对应的 task 及 project 权限，并获取 content
@login_required
@require_http_methods(['POST'])
def get_document_content(request, document_id):
    try:
        # 获取文档并检查权限
        document = Document.objects.get(id=document_id)
        if document.task.project.user != request.user:
            return HttpResponseForbidden({
                'error': '无权限访问此文档'
            }, content_type='application/json')

        return JsonResponse({
            'id': document.id,
            'name': document.name,
            'content': document.content,
        })

    except Document.DoesNotExist:
        raise Http404({
            'error': '文档不存在'
        })

# 3. 根据 Document id ，查询对应的 task 及 project 权限，并更新 name 和 content
@login_required
@require_http_methods(['POST'])
def update_document(request, document_id):
    try:
        # 获取文档并检查权限
        document = Document.objects.get(id=document_id)
        if document.task.project.user != request.user:
            return HttpResponseForbidden({
                'error': '无权限修改此文档'
            }, content_type='application/json')

        # 解析请求数据
        data = json.loads(request.body)
        if not all(k in data for k in ('name', 'content')):
            return JsonResponse({
                'error': '缺少必要参数(name或content)'
            }, status=400)

        # 更新文档
        document.name = data['name']
        document.content = data['content']
        document.save()

        return JsonResponse({
            'message': '文档更新成功'
        })

    except Document.DoesNotExist:
        raise Http404({
            'error': '文档不存在'
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'error': '无效的JSON格式'
        }, status=400)


# 4. 根据提供的标题和内容，创建 Document
@login_required
@require_http_methods(['POST'])
def create_document(request, task_id):
    try:
        # 获取任务并检查权限
        task = Material_Task.objects.get(id=task_id)
        if task.project.user != request.user:
            return HttpResponseForbidden({
                'error': '无权限创建文档'
            }, content_type='application/json')

        # 解析请求数据
        data = json.loads(request.body)
        if not all(k in data for k in ('name', 'content')):
            return JsonResponse({
                'error': '缺少必要参数(name或content)'
            }, status=400)

        # 创建文档
        document = Document.objects.create(
            task=task,
            name=data['name'],
            content=data['content'],
        )

        return JsonResponse({
            'id': document.id,
            'name': document.name
        })

    except Material_Task.DoesNotExist:
        raise Http404({
            'error': '任务不存在'
        })
    except json.JSONDecodeError:
        return JsonResponse({
            'error': '无效的JSON格式'
        }, status=400)


# 5. 根据 Document id ，查询对应的 task 及 project 权限，并删除 Document
@login_required
@require_http_methods(['POST'])
def delete_document(request, document_id):
    try:
        # 获取文档并检查权限
        document = Document.objects.get(id=document_id)
        if document.task.project.user != request.user:
            return HttpResponseForbidden({
                'error': '无权限删除此文档'
            }, content_type='application/json')

        # 删除文档
        document.delete()

        return JsonResponse({
            'message': '文档删除成功'
        })

    except Document.DoesNotExist:
        raise Http404({
            'error': '文档不存在'
        })


# async def call_ai_tools(request, task_id):
#     try:
#         # 获取任务并检查权限
#         task = await Material_Task.objects.select_related('project', 'project__user').aget(id=task_id)
#         # if task.project.user != request.user:
#         #     return HttpResponseForbidden({
#         #         'error': '无权限调用 AI 助手'
#         #     }, content_type='application/json')

#         project = task.project
#         # 获取 prompt
#         work_dir = os.getcwd()
#         prompt_file_path = os.path.join(work_dir, 'prompts', 'ai_helper.md')
#         with open(prompt_file_path) as f:
#             prompt_temp = f.read()
        
#         prompt = (
#             prompt_temp.replace('{theme}', project.theme)
#             .replace('{audience}', project.audience)
#             .replace('{place}', project.place)
#             .replace('{duration}', str(project.duration))
#             .replace('{target}', project.target)
#             .replace('{tasks}', '=>'.join(project.get_material_task_path(task_id)))
#         )

#         # 调用 AI 助手
#         web_browser = Web_Browser(task_id, prompt)
#         await web_browser.start_llm_workspace()

#         return JsonResponse({
#             'message': 'AI 助手调用成功'
#         })

#     except Material_Task.DoesNotExist:
#         raise Http404({
#             'error': '任务不存在'
#         })

@csrf_exempt
def add_file_to_task(request, task_id):

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({
            'error': '无效的JSON格式'
        }, status=400, headers={'Access-Control-Allow-Origin': '*'})
    
    api_key = data.get('api_key')
    content = data.get('content')
    name = data.get('name')

    # 如果缺少任何参数，返回错误
    if not api_key or not content or not name:
        return JsonResponse({
            'error': '缺少必要参数(api_key, content, name)'
        }, status=400, headers={'Access-Control-Allow-Origin': '*'})

    task = Material_Task.objects.get(id=task_id)
    if str(task.project.user.api_key) != api_key:
        return JsonResponse({
            'error': '凭证错误'
        }, status=400, headers={'Access-Control-Allow-Origin': '*'})

    # 保存文件
    doc, _ = Document.objects.update_or_create(
        task=task,
        name=name,
        defaults={
            'content': content
        }
    )

    return JsonResponse({
        'status': 'success',
        'document_id': doc.id,
    }, headers={'Access-Control-Allow-Origin': '*'})
