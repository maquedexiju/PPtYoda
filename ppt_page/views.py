from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json
from .models import PPt_Page, Page_and_Doc, Page_and_Template
from project_manage.models import Project
from materials.models import Document

def _update(data, key, model):
    value = data.get(key, None)
    if value:
        setattr(model, key, value)

# 2. 根据上传的 name 和 desc 修改 name 及 description
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def update_ppt_page(request, page_id):
    try:
        # name = data.get('name', '')
        # desc = data.get('desc', '')
        # p_type = data.get('p_type', '')

        # if not all([name]):
        #     return JsonResponse({'error': '缺少必要参数'}, status=400)

        ppt_page = PPt_Page.objects.get(id=page_id)
        # 如果 ppt_page 不存在，返回错误
        if not ppt_page or ppt_page.project.user != request.user:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        data = json.loads(request.body)
        # 保存修改
        _update(data, 'name', ppt_page)
        _update(data, 'description', ppt_page)
        _update(data, 'p_type', ppt_page)
        ppt_page.save()

        return JsonResponse({
            'id': ppt_page.id,
            'name': ppt_page.name,
            'description': ppt_page.description,
            'p_type': ppt_page.p_type
        })
    except PPt_Page.DoesNotExist:
        return JsonResponse({'error': 'PPT页面不存在'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# 3. 根据 id 生成 prompt（待补充具体逻辑）
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def generate_prompt(request):
    try:
        data = json.loads(request.body)
        page_id = data.get('id')

        if not page_id:
            return JsonResponse({'error': '缺少页面ID'}, status=400)

        ppt_page = PPt_Page.objects.get(id=page_id)
        # 待补充：根据实际需求实现prompt生成逻辑
        prompt = f"生成关于'{ppt_page.name}'的PPT内容：{ppt_page.description}"

        ppt_page.prompt = prompt
        ppt_page.save()

        return JsonResponse({'prompt': prompt})
    except PPt_Page.DoesNotExist:
        return JsonResponse({'error': 'PPT页面不存在'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# 4. 根据 id 生成 full_text（待补充具体逻辑）
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def generate_full_text(request):
    try:
        data = json.loads(request.body)
        page_id = data.get('id')

        if not page_id:
            return JsonResponse({'error': '缺少页面ID'}, status=400)

        ppt_page = PPt_Page.objects.get(id=page_id, p_type='content')
        # 待补充：根据实际需求实现full_text生成逻辑
        full_text = f"{ppt_page.name}\n{ppt_page.description}\n{ppt_page.prompt or ''}"

        ppt_page.full_text = full_text
        ppt_page.save()

        return JsonResponse({'full_text': full_text})
    except PPt_Page.DoesNotExist:
        return JsonResponse({'error': 'PPT页面不存在'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# 5. 根据 id 返回关联的 doc 列表
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def get_related_docs(request, page_id):
    try:

        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, p_type='content')
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        if ppt_page.project.user != request.user:
            return JsonResponse({'error': '权限不足'}, status=403)


        page_docs = Page_and_Doc.objects.filter(ppt_page_id=page_id)
        docs = [{
            # 'id': pd.id,
            'id': pd.document.id,
            'name': pd.document.name,
            # 'doc_path': ppt_page.project.get_material_task_path_by_id(pd.document.task.id),
            'type': pd.type,
        } for pd in page_docs]

        return JsonResponse({'docs': docs})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# create_doc_relation
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def create_doc_relation(request, page_id):
    try:
        data = json.loads(request.body)
        doc_id = data.get('doc_id')

        if not doc_id:
            return JsonResponse({'error': '缺少文档ID'}, status=400)

        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, p_type='content')
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        if ppt_page.project.user != request.user:
            return JsonResponse({'error': '权限不足'}, status=403)

        # 检查文档是否存在
        doc = Document.objects.get(id=doc_id)
        if not doc:
            return JsonResponse({'error': '文档不存在'}, status=404)

        # 创建关联关系
        Page_and_Doc.objects.create(
            ppt_page=ppt_page,
            document=doc,
            type='manual'
        )

        return JsonResponse({
            'message': '关联关系创建成功',
            'doc': {
                'id': doc.id,
                'name': doc.name,
                'type': 'manual',
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# 删除关联 delete_doc_relation
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def delete_doc_relation(request, page_id):
    try:
        data = json.loads(request.body)
        doc_id = data.get('doc_id')

        if not doc_id:
            return JsonResponse({'error': '缺少文档ID'}, status=400)

        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, p_type='content')
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        if ppt_page.project.user != request.user:
            return JsonResponse({'error': '权限不足'}, status=403)

        # 检查文档是否存在
        doc = Document.objects.get(id=doc_id)
        if not doc:
            return JsonResponse({'error': '文档不存在'}, status=404)
        
        # 删除关联
        Page_and_Doc.objects.filter(
            ppt_page_id=page_id,
            document_id=doc_id
        ).delete()

        return JsonResponse({'message': '关联关系删除成功'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# 获取全文 get_full_text
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def get_full_text(request, page_id):
    try:
        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user, p_type='content')
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        return JsonResponse({'full_text': ppt_page.full_text or ''})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# 保存大纲 save_full_text
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def save_full_text(request, page_id):
    try:
        data = json.loads(request.body)
        full_text = data.get('full_text')
        api_key = data.get('api_key', None)

        if not full_text:
            return JsonResponse({'error': '缺少大纲内容'}, status=400)

        # 检查权限
        if request.user:
            ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user, p_type='content')
            if not ppt_page:
                return JsonResponse({'error': 'PPT页面不存在'}, status=404)
        elif api_key:
            ppt_page = PPt_Page.objects.get(id=page_id, p_type='content')
            if ppt_page.project.user.api_key != api_key:
                return JsonResponse({'error': '数据错误'}, status=400)
        else:
            return JsonResponse({'error': '缺少凭证'}, status=400)
            

        # 保存大纲
        ppt_page.full_text = full_text
        ppt_page.save()

        return JsonResponse({'message': '大纲保存成功'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# 获取 slide data
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def get_slide_data(request, page_id):

    try:
        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user, p_type__in=['content', 'construct'])
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        template = ppt_page.project.ppt_template
        try:
            page_and_template = Page_and_Template.objects.get(ppt_page=ppt_page, ppt_template=template)
        except Page_and_Template.DoesNotExist:
            return JsonResponse({'slide_data': ''})

        return JsonResponse({
            'slide_data': json.dumps(page_and_template.data, ensure_ascii=False, indent=4),
            'template_id': page_and_template.template_id,
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# 保存 slide data
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def save_slide_data(request, page_id):
    try:
        data = json.loads(request.body)
        slide_data = data.get('slide_data')

        if not slide_data:
            return JsonResponse({'error': '缺少 slide data 内容'}, status=400)

        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user, p_type__in=['content', 'construct'])
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        template = ppt_page.project.ppt_template
        page_and_template, _ = Page_and_Template.objects.get_or_create(ppt_page=ppt_page, ppt_template=template)
        page_and_template.data = json.loads(slide_data)
        page_and_template.save()

        return JsonResponse({'message': 'slide data 保存成功'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    

# 获取 quoted info，针对页面类型为 template 而言的
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def get_quoted_info(request, page_id):

    try:
        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user, p_type='template')
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        template = ppt_page.project.ppt_template
        try:
            page_and_template = Page_and_Template.objects.get(ppt_page=ppt_page, ppt_template=template)
        except Page_and_Template.DoesNotExist:
            return JsonResponse({'quoted_info': ''})

        return JsonResponse({'quoted_info': page_and_template.data})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# 保存 quoted info
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def save_quoted_info(request, page_id):
    try:
        data = json.loads(request.body)
        quoted_info = data.get('quoted_info')

        if not quoted_info:
            return JsonResponse({'error': '缺少 quoted info 内容'}, status=400)

        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user, p_type='template')
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        template = ppt_page.project.ppt_template
        page_and_template, _ = Page_and_Template.objects.get_or_create(ppt_page=ppt_page, ppt_template=template)
        page_and_template.data = quoted_info
        page_and_template.save()

        return JsonResponse({'message': 'quoted info 保存成功'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# 获取 page 对应 project 的 ppt_template 的 slide_templates
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def get_available_slide_templates(request, page_id):
    try:
        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user)
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        template = ppt_page.project.ppt_template
        slide_templates = template.slide_templates

        result = []
        for st in slide_templates:
            result.append({
                'id': st['id'],
                'name': st['name'],
                'description': st['description']
            })

        return JsonResponse({'slide_templates': result})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

## 变更 ppt_page 对应 page_and_template 的 template_id
@login_required
@csrf_exempt
@require_http_methods(["POST"])
def change_template(request, page_id):
    try:
        data = json.loads(request.body)
        template_id = data.get('template_id')

        # if not template_id:
        #     return JsonResponse({'error': '缺少 template_id 内容'}, status=400)

        # 检查权限
        ppt_page = PPt_Page.objects.get(id=page_id, project__user=request.user)
        if not ppt_page:
            return JsonResponse({'error': 'PPT页面不存在'}, status=404)

        template = ppt_page.project.ppt_template
        page_and_template = Page_and_Template.objects.get(ppt_page=ppt_page, ppt_template=template)
        page_and_template.template_id = template_id
        page_and_template.save()

        return JsonResponse({'message': 'template_id 变更成功'})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
