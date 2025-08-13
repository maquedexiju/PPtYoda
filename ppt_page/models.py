from django.db import models
from materials.models import Document
from project_manage.models import Project
from ppt_template.models import PPt_Template

class PPt_Page(models.Model):
    # 标题页的 ppt_page 不在 outline 当中，但命名为“标题”，在生成 ppt 时才生成
    id = models.AutoField(primary_key=True)
    TYPE_CHOICES = [
        ('content', '内容页'),
        ('construct', '构造页'), # 标题、目录、结尾
        ('section', '章节块'), # 模板中的章节块
        ('template', '模板页'), # 模板中的页
    ]
    p_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='content')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    prompt = models.TextField(blank=True, null=True)
    full_text = models.TextField(blank=True, null=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='ppt_pages', null=True)

    def __str__(self):
        return self.name

class Page_and_Doc(models.Model):
    id = models.AutoField(primary_key=True)
    ppt_page = models.ForeignKey(PPt_Page, on_delete=models.CASCADE, related_name='page_docs')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='page_docs')
    # 类型，包括手动选择和自动关联
    type = models.CharField(max_length=20, default='manual', choices=[
        ('manual', '手动选择'),
        ('auto', '自动关联'),
    ])

    def __str__(self):
        return f"{self.ppt_page.name} - {self.document.name}"


class Page_and_Template(models.Model):

    ppt_page = models.ForeignKey(PPt_Page, on_delete=models.CASCADE, related_name='page_templates')
    ppt_template = models.ForeignKey(PPt_Template, on_delete=models.CASCADE, related_name='page_templates')
    template_id = models.IntegerField(null=True, blank=True, default=None)
    data = models.JSONField(null=True, blank=True, default=dict)

    class Meta:
        unique_together = ('ppt_page', 'ppt_template')
        
    def __str__(self):
        return f"{self.ppt_page.name} - {self.ppt_template.name}"