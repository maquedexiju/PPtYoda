from django.db import models
from knowledge_base.tools.chroma_driver import Chroma_Driver
import re

class Material_Task(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    STATUS_CHOICES = [
        ('todo', 'Todo'),
        ('doing', 'Doing'),
        ('done', 'Done'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    project = models.ForeignKey('project_manage.Project', on_delete=models.CASCADE, related_name='tasks')

    def __str__(self):
        return self.name

    
    def _upgrade_vector_db_self(self, vector_db, project):

        # 在知识库中进行记录更新
        task_path_list = project.get_material_task_path(self.id)
        if not task_path_list:
            return

        task_path = '/'.join(task_path_list)

        for doc in Document.objects.filter(task=self.id):
            ## 构建文档的完整路径
            doc_path = f'{task_path}/{doc.name}'
            ## 插入或更新
            vector_db.update_or_add_document([doc.id], [doc_path], [{
                'type': 'title',
                'name': doc.name,
            }])


    def _upgrade_vector_db_sub_tasks(self, sub_tasks_list, vector_db, project):

        # 在知识库中进行记录更新
        for sub_task in sub_tasks_list:
            ## 更新自己
            task_obj = Material_Task.objects.get(id=sub_task['id'])
            task_obj._upgrade_vector_db_self(vector_db, project)
            ## 递归处理子任务
            if sub_task['sub_tasks']:
                self._upgrade_vector_db_sub_tasks(sub_task['sub_tasks'], vector_db, project)




    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.project.doc_db_outdated()

        # # 在知识库中进行记录更新
        # ## 获取 task 和 project
        # project = self.project
        # db_name = f'project_{project.id}_doc'
        # vector_db = Chroma_Driver(collection_name=db_name)

        # ## 自己更新
        # self._upgrade_vector_db_self(vector_db, project)
        # ## 获取 task 的子任务，让子任务各自处理自己的文档
        # sub_tasks = project.get_material_task_children_tasks(self.id)
        # if sub_tasks:
        #     self._upgrade_vector_db_sub_tasks(sub_tasks, vector_db, project)

class Document(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    content = models.TextField()
    task = models.ForeignKey(Material_Task, on_delete=models.CASCADE, related_name='documents')

    def __str__(self):
        return self.name

    
    def content_with_head_level(self, highest_level=2):
        # 调整标题级别
        original_levels = []
        mod_line_list = []
        is_in_code = False
        for line in self.content.split('\n'):

            if line.startswith('```'):
                is_in_code = not is_in_code
                mod_line_list.append(line)
                continue

            match = re.search(r'^(#+) ', line)
            if match:
                level = len(match.group(1))
                if len(original_levels) == 0:
                    original_levels.append(level)
                else:
                    if level > original_levels[-1]:
                        original_levels.append(level)
                    else:
                        while len(original_levels) > 0 and level < original_levels[-1]:
                            original_levels.pop()
                        if len(original_levels) == 0 or level > original_levels[-1]:
                            original_levels.append(level)
                
                # 设置新的标题级别
                corrected_level = highest_level + len(original_levels) - 1
                corrected_line = line.replace('#' * level, '#' * corrected_level)
                mod_line_list.append(corrected_line)
            else:
                mod_line_list.append(line)

        return '\n'.join(mod_line_list)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        self.task.project.doc_db_outdated()


        # if not self.pk:
        #     return

        # # 在知识库中进行记录更新
        # ## 获取 task 和 project
        # task = self.task
        # project = task.project
        # db_name = f'project_{project.id}_doc'

        # ## 获取 task 的完整路径
        # task_path_list = project.get_material_task_path(task.id)
        # task_path = '/'.join(task_path_list)
        # ## 构建文档的完整路径
        # doc_path = f'{task_path}/{self.name}'

        # ## 插入或更新
        # vector_db = Chroma_Driver(collection_name=db_name)
        # vector_db.update_or_add_document([self.id], [doc_path], [{
        #     'type': 'title',
        #     'name': self.name,
        # }])