from django.db import models
from django.conf import settings
from django.core.files.storage import FileSystemStorage
import os

# 自定义文件存储
class KnowledgeBaseStorage(FileSystemStorage):
    def get_available_name(self, name, max_length=None):
        # 如果文件名已存在，不添加后缀
        if os.path.exists(self.path(name)):
            os.remove(self.path(name))
        return name

# 初始化存储系统
knowledge_storage = KnowledgeBaseStorage()

class Knowledge_Base(models.Model):
    name = models.CharField(max_length=255, verbose_name="知识库名称")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="knowledge_bases")
    def get_file_path(self, file_name):
        return f'knowledges/{self.user.id}/{self.name}/chroma.sqlite3'
    file = models.FileField(
        upload_to=get_file_path,
        storage=knowledge_storage,
        verbose_name="知识库文件"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        verbose_name = "知识库"
        verbose_name_plural = "知识库"
        unique_together = ('name', 'user')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # 如果更新名称，删除旧文件
        if self.pk:
            old_instance = Knowledge_Base.objects.get(pk=self.pk)
            if old_instance.name != self.name:
                old_instance.file.delete(save=False)
        super().save(*args, **kwargs)
