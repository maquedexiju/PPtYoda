from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Project_Template

# 获取工程模板列表，返回 id 和 name
@require_http_methods(["POST"])
def get_project_template_list(request):
    templates = Project_Template.objects.all().values('id', 'name')
    return JsonResponse({'project_templates': list(templates)})
