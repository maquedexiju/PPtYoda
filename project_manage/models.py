from channels.db import sync_to_async
from django.db import models
from django.conf import settings
import re
import uuid
import json
from knowledge_base.tools.chroma_driver import Chroma_Driver

from materials.models import Document, Material_Task
from ppt_template.models import PPt_Template
from knowledge_base.models import Knowledge_Base
from project_template.models import Project_Template

class Project(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    theme = models.CharField(max_length=100, blank=True, default='')
    audience = models.CharField(max_length=100, blank=True, default='')
    place = models.CharField(max_length=100, blank=True, default='')
    duration = models.IntegerField(blank=True, default=0)
    target = models.CharField(max_length=100, blank=True, default='')

    ppt_template = models.ForeignKey(PPt_Template, on_delete=models.SET_NULL, related_name='projects', null=True, blank=True)
    knowledge_base = models.ForeignKey(Knowledge_Base, on_delete=models.SET_NULL, related_name='projects', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    outline = models.JSONField(default=list, blank=True)
    # 一个 dict，包含 name, desc, sub_tasks
    # 标题页的 ppt_page 不在 outline 当中，但命名为“标题”，在生成 ppt 时才生成
    material_tasks = models.JSONField(default=list, blank=True)
    # 一个 dict，包含 name, desc, status, sub_tasks
    doc_db_updated = models.BooleanField(default=False)
    # 对应的 project_template
    project_template = models.ForeignKey(Project_Template, on_delete=models.PROTECT, null=True, blank=True, default=None)

    # 当前任务，可选项 materials, outline, ppt
    STAGE_CHOICES = [
        ('materials', '素材'),
        ('outline', '大纲'),
        ('ppt', 'ppt'),
    ]
    stage = models.CharField(max_length=100, choices=STAGE_CHOICES, default='materials')

    def __str__(self):
        return self.name

    def _get_dict_ids(self, tasks):
        ids = []
        for task in tasks:
            if 'id' in task.keys() and type(task['id']) == int: ids.append(task['id']) 
            if 'sub_tasks' in task.keys():
                ids.extend(self._get_dict_ids(task['sub_tasks']))
        return ids
    

    def _flatten_dict(self, tasks):
        flat_tasks = []
        for task in tasks:
            flat_tasks.append(task)
            if 'sub_tasks' in task.keys():
                flat_tasks.extend(self._flatten_dict(task['sub_tasks']))
        return flat_tasks

    
    def _clear_json_str(self, json_str):
        if json_str.startswith('```json'):
            json_str = json_str[7:-3]
        return json_str

    # =========
    # 素材管理
    # =========
    async def sync_material_tasks_from_json(self, json_str):
        """通过JSON字符串同步material_tasks及关联的Material_Task记录"""
        from materials.models import Material_Task
        
        try:
            if type(json_str) not in [dict, list]:
                new_tasks = json.loads(self._clear_json_str(json_str))
            else:
                new_tasks = json_str
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON string")
        
        new_ids = self._get_dict_ids(new_tasks)
        old_tasks = self.material_tasks
        old_ids = self._get_dict_ids(old_tasks)

        # 遍历 new_tasks，为没有 id 的创建 Material_Task
        # 为具有 id 的查询数据库，更新数据
        flatted_new_tasks = self._flatten_dict(new_tasks)
        for task in flatted_new_tasks:
            if 'id' not in task.keys() or (type(task['id']) == str and task['id'].startswith('t-')):
                mt = await Material_Task.objects.acreate(
                    project=self,
                    name=task['name'],
                    description=task.get('desc', ''),
                    status=task.get('status', 'todo')
                )
                task['id'] = mt.id
            else:
                # 从数据库查询
                mt = await Material_Task.objects.aget(id=task['id'])
                # 如果数据有变更，更新数据
                if mt.name != task['name'] or mt.description != task.get('desc', '') or mt.status != task.get('status', 'todo'):
                    mt.name = task['name']
                    mt.description = task.get('desc', '')
                    mt.status = task.get('status', 'todo')
                    # 保存到数据库
                    await mt.asave()
        
        # 删除仅存在于 old_ids 但不存在与 new_ids 中的 Material_Task
        await Material_Task.objects.filter(
            project=self,
            id__in=old_ids
        ).exclude(
            id__in=new_ids
        ).adelete()

        self.material_tasks = new_tasks
        await self.asave()

        return self.material_tasks

    
    def parse_markdown_materials(self, md_text):
        """解析Markdown列表生成材料任务结构并创建Material_Task记录"""
        # 正则表达式匹配列表项（支持-/*/- [ ]/- [x]开头）
        # 支持-/*前缀的复选框和普通列表项
        pattern = re.compile(r'^(\s*)([-*]) (?:\[([xX ])\] ?)?(.*)$', re.MULTILINE)
        matches = pattern.findall(md_text)
        materials = []
        stack = []

        for indent, bullet, checkbox, content in matches:
            # 计算层级（每4个空格为一级）
            level = len(indent) // 4
            # 解析名称和描述（支持"名称：描述"格式）
            if ':' in content and len(content.split(':', 1)) == 2:
                name, desc = content.split(':', 1)
                name = name.strip()
                desc = desc.strip()
            else:
                name = content.strip()
                desc = ''

            # 创建材料项
            item = {
                'id': str(uuid.uuid4())[:8],
                'name': name,
                'desc': desc,
                # 根据复选框状态设置任务状态
                'status': 'done' if checkbox and checkbox.lower() == 'x' else 'todo',
                'sub_tasks': []
            }

            # 调整层级栈
            while len(stack) > level:
                stack.pop()

            # 添加到父节点或根节点
            if stack:
                stack[-1]['sub_tasks'].append(item)
            else:
                materials.append(item)
            stack.append(item)

        # 更新项目材料
        self.material_tasks = materials
        self.save()

        # 创建Task记录
        self._create_tasks_from_materials(materials)
        return self.material_tasks

    def _create_tasks_from_materials(self, material_items):
        """从材料结构递归创建Task记录"""
        from materials.models import Material_Task
        for item in material_items:
            task = Material_Task.objects.create(
                project=self,
                name=item['name'],
                description=item['desc'],
                status=item['status'],
            )
            # 递归处理子任务
            if item['sub_tasks']:
                self._create_tasks_from_materials(item['sub_tasks'])


    def generate_doc_tree(self, tasks=None):
        # 遍历 素材任务，生成文档树
        if tasks is None:
            tasks = self.material_tasks

        doc_tree = []
        for mt in tasks:
            docs = Document.objects.filter(task__id=mt['id'])
            data = {
                'id': mt['id'],
                'name': mt['name'],
                'type': 'material_task',
                'docs': [
                    {
                        'id': doc.id,
                        'name': doc.name,
                        'type': 'document',
                    }
                    for doc in docs
                ],
            }
            if 'sub_tasks' in mt.keys() and mt['sub_tasks']:
                data['sub_tasks'] = self.generate_doc_tree(mt['sub_tasks'])
            doc_tree.append(data)
        return doc_tree

    
    async def _material_files_to_dict(self, material_tasks=None):
        # 根据给定的 material_tasks list，获取相关任务及子任务包括的 document，整理成 md 格式
        if material_tasks == None:
            material_tasks = self.material_tasks

        files_dict = []
        for task in material_tasks:
            # 有描述则添加 name: desc 否则添加 name
            
            task_id = task['id']
            task_obj = await Material_Task.objects.aget(id=task_id)

            # 添加当前目录下的文件
            docs = Document.objects.filter(task=task_obj)
            async for d in docs:
                files_dict.append({
                    'id': d.id,
                    'name': d.name
                })
            if 'sub_tasks' in task.keys():
                sub_docs_list = await self._material_files_to_dict(task['sub_tasks'])
                for sub_doc in sub_docs_list:
                    sub_doc['name'] = f'{task["name"]}/{sub_doc["name"]}'
                    files_dict.append(sub_doc)

        return files_dict

    
    def get_material_task_path(self, task_id, tasks=None):

        if type(task_id) == str:
            task_id = int(task_id)
        # 根据 task_id 获取 task 路径
        if tasks == None:
            tasks = self.material_tasks
        for t in tasks:
            if t['id'] == task_id:
                return [t['name']]
            if 'sub_tasks' in t.keys():
                res = self.get_material_task_path(task_id, t['sub_tasks'])
                if res:
                    return [t['name']] + res
        return None
    
    def get_material_task_children_tasks(self, task_id, tasks=None):
        if tasks == None:
            tasks = self.material_tasks
        for t in tasks:
            if t['id'] == task_id:
                return t['sub_tasks']
            if 'sub_tasks' in t.keys():
                res = self.get_material_task_children_tasks(task_id, t['sub_tasks'])
                if res:
                    return res
        return None

    def doc_db_outdated(self):
        self.doc_db_updated = False
        self.save()

    
    def _update_material_tasks_doc_db(self, vector_db, material_tasks=None):

        if material_tasks == None:
            material_tasks = self.material_tasks

        for task in material_tasks:
            # 在知识库中进行记录更新
            task_path_list = self.get_material_task_path(task['id'])
            if not task_path_list:
                continue
            task_path = '/'.join(task_path_list)

            for doc in Document.objects.filter(task__id=task['id']):
                ## 构建文档的完整路径
                doc_path = f'{task_path}/{doc.name}'
                ## 插入或更新
                vector_db.update_or_add_document([doc.id], [doc_path], [{
                    'type': 'title',
                    'name': doc.name,
                }])
            # 递归处理子任务
            if 'sub_tasks' in task.keys():
                self._update_material_tasks_doc_db(vector_db, task['sub_tasks'])
        

    def update_doc_db(self):
        # 在知识库中进行记录更新

        ## 获取 task 和 project
        db_name = f'project_{self.id}_doc'
        vector_db = Chroma_Driver(collection_name=db_name)
        self._update_material_tasks_doc_db(vector_db)
        self.doc_db_updated = True
        self.save()


    # =========
    # 大纲管理
    # =========
    def parse_markdown_outline(self, md_text):
        """解析Markdown列表生成大纲结构并创建PPt_Page记录"""
        # 正则表达式匹配列表项（支持-/*/- [ ]/- [x]开头）
        pattern = re.compile(r'^(\s*)([-*]|\- \[.\]) (.*)$', re.MULTILINE)
        matches = pattern.findall(md_text)
        outline = []
        stack = []

        for indent, marker, content in matches:
            # 计算层级（每4个空格为一级）
            level = len(indent) // 4
            # 解析名称和描述（支持"名称：描述"格式）
            if ':' in content and len(content.split(':', 1)) == 2:
                name, desc = content.split(':', 1)
                name = name.strip()
                desc = desc.strip()
            else:
                name = content.strip()
                desc = ''

            # 创建大纲项
            item = {
                'id': str(uuid.uuid4())[:8],
                'name': name,
                'desc': desc,
                'sub_tasks': []
            }

            # 调整层级栈
            while len(stack) > level:
                stack.pop()

            # 添加到父节点或根节点
            if stack:
                stack[-1]['sub_tasks'].append(item)
            else:
                outline.append(item)
            stack.append(item)

        # 更新项目大纲
        self.outline = outline
        self.save()

        # 创建PPt_Page记录
        self._create_ppt_pages_from_outline(outline)
        return outline

    def _create_ppt_pages_from_outline(self, outline_items, parent_page=None):
        """从大纲结构递归创建PPt_Page记录"""
        from ppt_page.models import PPt_Page
        for item in outline_items:
            ppt_page = PPt_Page.objects.create(
                project=self,
                name=item['name'],
                description=item['desc'],
                prompt=f"Generate PPT content for: {item['name']}"
            )
            # 递归处理子任务
            if item['sub_tasks']:
                self._create_ppt_pages_from_outline(item['sub_tasks'], ppt_page)

    def _add_kv_to_list(self, dic_list, k, v):
        for dic in dic_list:
            if k not in dic.keys():
                dic[k] = v
            if 'sub_tasks' in dic.keys():
                self._add_kv_to_list(dic['sub_tasks'], k, v)

    async def sync_ppt_pages_from_json(self, json_str):
        """通过JSON字符串同步ppt_pages及关联的PPt_Page记录"""
        from ppt_page.models import PPt_Page, Page_and_Template

        try:
            if type(json_str) not in [dict, list]:
                new_outline = json.loads(self._clear_json_str(json_str))
            else:
                new_outline = json_str
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON string")
        self._add_kv_to_list(new_outline, 'p_type', 'content')

        old_outline = self.outline
        # 遍历 new_outline，对于有 id 的更新；没有 id 的创建
        flatted_new_outline = self._flatten_dict(new_outline)
        for item in flatted_new_outline:
            if 'id' in item.keys() and type(item['id']) == int:
                # 更新
                ppt_page = await PPt_Page.objects.aget(
                    project=self,
                    id=item['id']
                )
                # data 清空
                if ppt_page.p_type != item['p_type']:
                    if item['p_type'] == 'content': d = {}
                    else: d = []
                    await Page_and_Template.objects.filter(
                        ppt_page=ppt_page,
                    ppt_template=self.ppt_template
                    ).aupdate(
                        data=d
                    )
                # 数据保存
                await PPt_Page.objects.filter(
                    project=self,
                    id=item['id']
                ).aupdate(
                    name=item['name'],
                    description=item.get('desc', ''),
                    p_type=item.get('p_type', 'content')
                )
            else:
                # 创建
                p_type = item.get('p_type', 'content')
                pp = await PPt_Page.objects.acreate(
                    project=self,
                    name=item['name'],
                    description=item.get('desc', ''),
                    p_type=p_type
                )
                item['id'] = pp.id

                # 如果是 sections 或 template 类型，需要创建关联记录
                if p_type in ['section', 'template']:
                    data = {
                        f'{p_type}_name': item['name'],
                    }

                    await Page_and_Template.objects.acreate(
                        ppt_page=pp,
                        ppt_template=self.ppt_template,
                        data=[]
                    )
                    

        # 删除仅存在于 old_ids 但不存在与 new_ids 的 page
        old_ids = self._get_dict_ids(old_outline)
        new_ids = self._get_dict_ids(new_outline)
        await PPt_Page.objects.filter(
            project=self,
            id__in=old_ids
        ).exclude(
            id__in=new_ids
        ).adelete()

        # 保存和返回数据
        self.outline = new_outline
        await self.asave()
        return new_outline

    
    def get_outline_path_by_id(self, id):
        # 通过 id，找到直到该任务的路径列表
        path = []
        def dfs(nodes, id):
            for node in nodes:
                if node['id'] == id:
                    path.append(node['name'])
                    return True
                if 'sub_tasks' in node.keys():
                    if dfs(node['sub_tasks'], id):
                        path.append(node['name'])
                        return True
            return False
        
        dfs(self.outline, id)
        path.reverse()
        return path

    # outline 转 md
    def trans_outline_to_md_list(self, outline=None):
        # 根据给定的 outline list，获取相关任务及子任务包括的 document，整理成 md 格式
        if outline is None: outline = self.outline
        md_list = []
        for task in outline:
            # 有描述则添加 name: desc 否则添加 name
            if task['desc']:
                md_list.append(f'- {task["name"]}: {task["desc"]}')
            else:
                md_list.append(f'- {task["name"]}')
            
            if task['sub_tasks']:
                sub_docs_list = self.trans_outline_to_md_list(task['sub_tasks'])
                for sub_doc in sub_docs_list:
                    md_list.append(f'    {sub_doc}')

        return md_list

    # 获取 outline 的所有叶子节点
    def get_all_leaf_nodes(self, nodes):
        leaf_nodes = []
        def dfs(nodes):
            for node in nodes:
                if not node['sub_tasks'] or len(node['sub_tasks']) == 0:
                    leaf_nodes.append(node)
                else:
                    dfs(node['sub_tasks'])
        dfs(nodes)
        
        return leaf_nodes

    # 将 outline 转成带有级别标识的、扁平的 list
    def flatten_outline(self):
        outline = self.outline
        flat_list = []

        def dfs(nodes, level=1):
            for node in nodes:
                d = {
                    'id': node['id'],
                    'name': node['name'],
                    'desc': node['desc'],
                    'p_type': node['p_type'],
                    'level': level
                }
                if 'sub_tasks' in node.keys() and len(node['sub_tasks']) > 0:
                    d['chapter'] = True
                flat_list.append(d)
                if node['sub_tasks']:
                    dfs(node['sub_tasks'], level + 1)
        dfs(outline)

        return flat_list


class PPt_Generate(models.Model):
    STAGE_CHOICES = [
        ('file_generation', '文件生成'),
        ('multimedia_processing', '多媒体处理'),
        ('final_file', '最终文件'),
        ('completed', '完成'),
    ]
    id = models.AutoField(primary_key=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='ppt_generations')

    # 自定义临时文件路径
    async def get_temp_file_path(self):
        id = await sync_to_async(lambda: self.project.id)()
        return f'ppt_files/{id}/temp.pptx'
    
    # 自定义上传路径函数
    def get_intermediate_file_path(self, filename):
        return f'ppt_files/{self.project.id}/intermediate.pptx'
    
    def get_final_file_path(self, filename):
        return f'ppt_files/{self.project.id}/{self.project.name}.pptx'
    
    intermediate_file = models.FileField(upload_to=get_intermediate_file_path, blank=True, null=True)
    final_file = models.FileField(upload_to=get_final_file_path, blank=True, null=True)
    current_stage = models.CharField(max_length=30, choices=STAGE_CHOICES, default='file_generation')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PPT Generate for {self.project.name} - {self.get_current_stage_display()}"
