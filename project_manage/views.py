from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.http import JsonResponse, FileResponse
from django.conf import settings
from .models import Project, PPt_Generate
from materials.models import Material_Task, Document
from openai import OpenAI
import json
import uuid
import asyncio

# @login_required
# def create_project(request):
#     if request.method == 'POST':
#         try:
#             # 获取请求参数
#             data = json.loads(request.body)
#             theme = data.get('theme')
#             audience = data.get('audience')
#             place = data.get('place')
#             market = data.get('market')
#             target = data.get('target')

#             # 验证必要参数
#             if not all([theme, audience, place, market, target]):
#                 return JsonResponse({
#                     'status': 'error',
#                     'message': '缺少必要参数: 主题、受众、场合、市场、目标均为必填项'
#                 }, status=400)

#             # 创建项目对象
#             project = Project.objects.create(
#                 user=request.user,
#                 name=theme,
#                 theme=theme,
#                 audience=audience,
#                 place=place,
#                 market=market,
#                 target=target,
#                 material_tasks=[]
#             )

#             # 配置OpenAI客户端
#             try:
#                 client = OpenAI(
#                     base_url = settings.LLM_BASE_URL,
#                     api_key = settings.LLM_API_KEY
#                 )
#             except:
#                 return JsonResponse({
#                     'status': 'error',
#                     'message': '未配置OpenAI API密钥'
#                 }, status=500)

#             # 生成LLM提示词
#             prompt = f"""
#             作为专业的项目管理助手，请根据以下项目信息生成结构化的材料收集任务列表：
#             项目主题: {theme}
#             目标受众: {audience}
#             应用场合: {place}
#             市场背景: {market}
#             项目目标: {target}

#             请按照以下要求生成任务：
#             1. 返回格式为JSON数组，每个任务包含name(任务名称)、desc(任务描述)、status(状态，默认'todo')、sub_tasks(子任务数组，结构同上)
#             2. 任务层级不超过3级，总任务数量控制在5-10个
#             3. 任务应覆盖材料收集的主要阶段和关键节点
#             4. 描述需具体、可执行，避免空泛表述
#             5. 确保JSON格式正确，不包含任何额外文本
#             """.strip()

#             # 调用OpenAI API生成任务
#             response = client.chat.completions.create(
#                 model=settings.LLM_MODEL,
#                 messages=[{'role': 'user', 'content': prompt}]
#             )

#             # 解析LLM响应
#             tasks_content = response.choices[0].message['content'].strip()
#             # material_tasks = json.loads(tasks_content)

#             # 保存任务到项目
#             # project.material_tasks = material_tasks
#             # project.save()
#             project.sync_material_tasks_from_json(tasks_content)

#             return JsonResponse({
#                 'status': 'success',
#                 'project_id': project.id,
#                 'message': '项目创建成功，已生成材料收集任务',
#                 'tasks_count': len(material_tasks)
#             })


#         except json.JSONDecodeError:
#             return JsonResponse({
#                 'status': 'error',
#                 'message': 'AI返回的任务格式不是有效的JSON'
#             }, status=500)
#         except openai.error.OpenAIError as e:
#             return JsonResponse({
#                 'status': 'error',
#                 'message': f'OpenAI API调用失败: {str(e)}'
#             }, status=500)
#         except Exception as e:
#             return JsonResponse({
#                 'status': 'error',
#                 'message': f'项目创建失败: {str(e)}'
#             }, status=500)
#     else:
#         return JsonResponse({
#             'status': 'error',
#             'message': '仅支持POST请求'
#         }, status=405)

@login_required
@require_POST
def update_project(request, project_id):
    try:
        # 获取项目并验证所有权
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在或无权访问'
        }, status=404)

    try:
        # 更新项目字段
        if 'name' in request.POST:
            project.name = request.POST['name']
        if 'theme' in request.POST:
            project.theme = request.POST['theme']
        if 'audience' in request.POST:
            project.audience = request.POST['audience']
        if 'place' in request.POST:
            project.place = request.POST['place']
        if 'duration' in request.POST:
            project.market = request.POST['market']
        if 'target' in request.POST:
            project.target = request.POST['target']

        project.save()
        return JsonResponse({
            'status': 'success',
            'message': '项目更新成功',
            'project_id': project.id
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'更新失败: {str(e)}'
        }, status=500)


@login_required
@require_POST
def delete_project(request, project_id):
    try:
        # 获取项目并验证所有权
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在或无权访问'
        }, status=404)

    try:
        project.delete()
        return JsonResponse({
            'status': 'success',
            'message': '项目删除成功'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'删除失败: {str(e)}'
        }, status=500)


@login_required
def project_detail(request, project_id):
    try:
        project = Project.objects.get(id=project_id, user=request.user)
        return JsonResponse({
            'status': 'success',
            'project': {
                'id': project.id,
                'name': project.name,
                'theme': project.theme,
                'audience': project.audience,
                'place': project.place,
                'duration': project.duration,
                'target': project.target,
                'created_at': project.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': project.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                'material_tasks': project.material_tasks,
                'outline': project.outline,
                'template': {
                    'id': project.ppt_template.id,
                    'name': project.ppt_template.name,
                    'sections': project.ppt_template.sections
                },
                'knowledge_base': {
                    'id': project.knowledge_base.id,
                    'name': project.knowledge_base.name
                } if project.knowledge_base else None,
                'stage': project.stage,
            }
        })
    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在或无权访问'
        }, status=404)

# change stage
@require_POST
@login_required
def change_stage(request, project_id):
    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在或无权访问'
        }, status=404)

    try:
        data = json.loads(request.body)
        stage = data.get('stage')
        project.stage = stage
        project.save()
        return JsonResponse({
            'status': 'success',
            'message': '项目阶段更新成功',
            'project_id': project.id
        })
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'更新失败: {str(e)}'
        }, status=500)


@login_required
def list_projects(request):
    """列出当前用户的所有工程"""
    # 获取当前登录用户的所有项目
    projects = Project.objects.filter(user=request.user).order_by('-updated_at')
    
    # 序列化项目数据
    project_list = []
    for project in projects:
        project_list.append({
            'id': project.id,
            'name': project.name,
            'theme': project.theme,
            'audience': project.audience,
            'place': project.place,
            'duration': project.duration,
            'target': project.target,
            'created_at': project.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': project.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return JsonResponse({
        'status': 'success',
        'count': len(project_list),
        'projects': project_list
    })

# ============
# 素材管理
# ============

@require_POST
@login_required
async def update_material_tasks(request, project_id):

    data = json.loads(request.body)
    # project_id = data.get('project_id')
    tasks_content = data.get('tasks_content')

    project = await Project.objects.aget(id=project_id, user=request.user)
    result = await project.sync_material_tasks_from_json(tasks_content)
    return JsonResponse({
        'status': 'success',
        'message': '任务更新成功',
        'tasks_content': result
    })

def _trans_related_files_to_md_list(material_tasks):
    # 根据给定的 material_tasks list，获取相关任务及子任务包括的 document，整理成 md 格式
    md_list = []
    for task in material_tasks:
        # 有描述则添加 name: desc 否则添加 name
        if task['desc']:
            md_list.append(f'- {task["name"]}: {task["desc"]}')
        else:
            md_list.append(f'- {task["name"]}')
        
        task_id = task['id']
        task = Material_Task.get(id=task_id)
        # 添加当前目录下的文件
        docs = Document.objects.filter(material_task=task)
        for d in docs:
            md_list.append(f'    - {d.name}')
        
        if task['sub_tasks']:
            sub_docs_list = _trans_related_files_to_md_list(task['sub_tasks'])
            for sub_doc in sub_docs_list:
                md_list.append(f'    {sub_doc}')

    return md_list

# generate_doc_tree
@login_required
@require_POST
def generate_doc_tree(request, project_id):
    project = Project.objects.get(id=project_id, user=request.user)
    if not project:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在'
        }, status=404)
    doc_tree = project.generate_doc_tree()
    return JsonResponse({
        'status': 'success',
        'message': '文档树生成成功',
        'tasks_content': doc_tree
    })

# ============
# outline 管理
# ============
# 更新 outline
@login_required
@require_POST
async def update_outline(request, project_id):
    data = json.loads(request.body)
    tasks_content = data.get('tasks_content')

    project = await Project.objects.select_related('ppt_template').aget(id=project_id, user=request.user)
    result = await project.sync_ppt_pages_from_json(tasks_content)
    return JsonResponse({
        'status': 'success',
        'message': '任务更新成功',
        'tasks_content': result
    })


# 获取 outline
@login_required
@require_POST
async def get_outline(request, project_id):
    project = await Project.objects.aget(id=project_id, user=request.user)

    if not project.outline:
        return JsonResponse({
            'status': 'error',
            'message': '大纲不存在'
        }, status=404)
    outline = project.outline
    
    return JsonResponse({
        'status': 'success',
        'message': '大纲获取成功',
        'tasks_content': outline
    })

# ============
# PPT生成管理
# ============
@login_required
@require_POST
async def get_ppt_generation_status(request, project_id):
    try:
        # 获取项目
        project = await Project.objects.aget(id=project_id, user=request.user)
        
        # 获取或创建PPt_Generate对象
        ppt_generate, created = await PPt_Generate.objects.aget_or_create(
            project=project
        )
        
        # 构建响应数据
        data = {
            'current_stage': ppt_generate.current_stage,
            'intermediate_file': ppt_generate.intermediate_file.url if ppt_generate.intermediate_file else None,
            'final_file': ppt_generate.final_file.url if ppt_generate.final_file else None,
            'created_at': ppt_generate.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': ppt_generate.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return JsonResponse({
            'status': 'success',
            'message': 'PPT生成状态获取成功' if not created else 'PPT生成记录已创建',
            'generation_status': data
        })

    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'获取PPT生成状态失败: {str(e)}'
        }, status=500)

@login_required
def download_intermediate_file(request, project_id):
    try:
        # 获取项目和PPT生成记录
        project = Project.objects.get(id=project_id, user=request.user)
        ppt_generate = PPt_Generate.objects.get(project=project)
        
        if not ppt_generate.intermediate_file:
            return JsonResponse({
                'status': 'error',
                'message': '文件不存在'
            }, status=404)
        
        # 返回文件下载响应
        response = FileResponse(ppt_generate.intermediate_file.open('rb'))
        response['Content-Disposition'] = f'attachment; filename={project.name}_intermediate.pptx'
        return response
    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在或无权访问'
        }, status=404)
    except PPt_Generate.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'PPT生成记录不存在'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'下载中间PPT文件失败: {str(e)}'
        }, status=500)


def download_final_file(request, project_id):
    try:
        # 获取项目和PPT生成记录
        project = Project.objects.get(id=project_id, user=request.user)
        ppt_generate = PPt_Generate.objects.get(project=project)
        
        if not ppt_generate.final_file:
            return JsonResponse({
                'status': 'error',
                'message': '文件不存在'
            }, status=404)
        
        # 返回文件下载响应
        response = FileResponse(ppt_generate.final_file.open('rb'))
        response['Content-Disposition'] = f'attachment; filename={project.name}_final.pptx'
        return response
    except Project.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在'
        }, status=404)
    except PPt_Generate.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': 'PPT生成记录不存在'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'下载最终PPT文件失败: {str(e)}'
        }, status=500)

# 获取 project 的 ppt_template 的 sections
@login_required
@require_POST
def get_ppt_template_sections(request, project_id):
    project = Project.objects.get(id=project_id, user=request.user)
    if not project:
        return JsonResponse({
            'status': 'error',
            'message': '项目不存在'
        }, status=404)
    sections = project.ppt_template.sections
    return JsonResponse({
        'status': 'success',
        'message': 'PPT模板获取成功',
        'sections': sections
    })