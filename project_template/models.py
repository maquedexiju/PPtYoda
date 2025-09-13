from django.db import models

# Create your models here.
class Project_Template(models.Model):
    name = models.CharField(max_length=100, verbose_name='模板名称')
    default_outline = models.JSONField(verbose_name='默认大纲', default=list, null=True, blank=True)
    default_materials = models.JSONField(verbose_name='默认材料清单', default=list, null=True, blank=True)

    class Meta:
        verbose_name = '工程模板'
        verbose_name_plural = '工程模板'

    def __str__(self):
        return self.name
