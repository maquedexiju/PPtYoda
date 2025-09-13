from django.db import models
from .tools.template_parse import  Template_Parser
from django.core.files.storage import FileSystemStorage
import os
from django.conf import settings

import logging
logger = logging.getLogger(__name__)

# 自定义文件存储
class PPTStorage(FileSystemStorage):
    def get_available_name(self, name, max_length=None):
        # 如果文件名已存在，不添加后缀
        if os.path.exists(self.path(name)):
            os.remove(self.path(name))
        return name

# 初始化存储系统
ppt_storage = PPTStorage()

# Create your models here.
class PPt_Template(models.Model):

    name = models.CharField(max_length=255)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def get_template_path(self, filename):
        return f'ppt_templates_files/{self.user.id}/{self.name}.pptx'

    file = models.FileField(
        upload_to=get_template_path,
        storage=ppt_storage,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    cover_template = models.JSONField(null=True, blank=True, default=dict)
    toc_template = models.JSONField(null=True, blank=True, default=dict)
    chapter_L1_template = models.JSONField(null=True, blank=True, default=dict)
    chapter_L2_template = models.JSONField(null=True, blank=True, default=dict)
    blank_template = models.JSONField(null=True, blank=True, default=dict)

    slide_templates = models.JSONField(null=True, blank=True, default=list)
    components = models.JSONField(null=True, blank=True, default=list)
    sections = models.JSONField(null=True, blank=True, default=dict)
    # 默认应该有的 components 应该包括 text

    class Meta:
        # name 和 user 是唯一的
        unique_together = ('name', 'user')

    def __str__(self):
        return self.name

    def parse_file(self):
        # 实现文件解析逻辑
        file_path = self.file.path
        required_components=['toc', 'text']
        # 必须的元素
        # toc: no 编号，title 标题
        # text：text 文本
        parser = Template_Parser(file_path, logger, required_components)
        slide_templates = parser.slide_templates
        content_templates = []
        for slide_template in slide_templates:
            # 判断是否是封面
            if slide_template['name'] in ['标题', '封面', '首页', 'cover']: 
                self.cover_template = slide_template
            # 判断是否是 toc
            elif slide_template['name'] in ['目录', 'toc']:
                self.toc_template = slide_template
            # 判断是否是 chapter_L1
            elif slide_template['name'] in ['章节', '一级标题', '一级目录', '一级章节', '一级大纲']:
                self.chapter_L1_template = slide_template
            # 判断是否是 chapter_L2
            elif slide_template['name'] in ['二级章节', '二级标题', '二级目录', '二级章节', '二级大纲']:
                self.chapter_L2_template = slide_template
            # 判断是否是 blank
            elif slide_template['name'] in ['空白', 'blank']:
                self.blank_template = slide_template
            else:
                content_templates.append(slide_template)
        
        self.slide_templates = content_templates

        
        self.components = parser.components
        self.sections = parser.extract_sections()


    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.parse_file()
        if 'force_insert' in kwargs:
            del kwargs['force_insert']
        super().save(*args, **kwargs)

        