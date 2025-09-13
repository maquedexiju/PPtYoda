import json
from math import e
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.core.files import File
# 引入 sync_to_async
from asgiref.sync import sync_to_async

from openai import AsyncOpenAI
import os
import base64

from ppt_killer.settings import PROJECT_CONFIG
from .models import Project, PPt_Generate
from ppt_page.models import PPt_Page, Document, Page_and_Doc, Page_and_Template
from materials.models import Material_Task
from ppt_template.models import PPt_Template
from project_manage.models import Project_Template
from knowledge_base.models import Knowledge_Base
from knowledge_base.tools.chroma_driver import Chroma_Driver

from ppt_template.tools.ppt_generate import PPt_Generator

import asyncio

toc_data_temp = '''
{
    "template_id": {template_id},
    "placeholders": [
        {
            "name": "toc",
            "content": "",
            "components_placeholders": [
                {toc_components}
            ],
            "type": "container"
        }
    ]
}'''

toc_component_temp = '''
[
    {
        "name": "title",
        "content": "{title}",
        "type": "text"
    },
    {
        "name": "number",
        "content": "{number}",
        "type": "text"
    }
]
'''

class CreateProject(AsyncWebsocketConsumer):
    async def connect(self):
        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')


    async def disconnect(self, close_code):
        print('disconnect')

    async def receive(self, text_data):
        # 获取 theme, name, desc, material_tasks
        data = json.loads(text_data)
        
        theme = data.get('theme', '')
        audience = data.get('audience', '')
        place = data.get('place', '')
        duration = data.get('duration', '')
        target = data.get('target', '')
        template_json = data.get('template', '')
        template_id = template_json['id']
        template = await PPt_Template.objects.aget(id=template_id)
        project_template = data.get('project_template', '')
        if project_template:
            project_template_id = project_template['id']
            project_template = await Project_Template.objects.aget(id=project_template_id)
        else:
            project_template = None

        knowledge_base_json = data.get('knowledge_base', '')
        if knowledge_base_json:
            knowledge_base_id = knowledge_base_json['id']
            knowledge_base = await Knowledge_Base.objects.aget(id=knowledge_base_id)
        else:
            knowledge_base = None

        await self.send(json.dumps({
            'status': 'doing',
            'step': 1,
            'desc': '正在创建项目'
        }))

        # 创建 project
        project = await Project.objects.acreate(
            user=self.scope['user'],
            name=theme,
            theme=theme,
            audience=audience,
            place=place,
            duration=duration,
            target=target,
            material_tasks=[],
            ppt_template=template,
            knowledge_base=knowledge_base,
            project_template=project_template
        )

        reference_tasks = project_template.default_materials if project_template else []
        await self.send(json.dumps({
            'status': 'doing',
            'step': 2,
            'desc': '分析素材生成任务'
        }))

        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'create_ppt_projects.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()
        
        prompt = (
            prompt_temp.replace('{theme}', theme)
            .replace('{audience}', audience)
            .replace('{place}', place)
            .replace('{duration}', str(duration))
            .replace('{target}', target)
            .replace('{reference_tasks}', json.dumps(reference_tasks, ensure_ascii=False))
        )

        # 配置OpenAI客户端
        try:
            client = AsyncOpenAI(
                base_url = settings.LLM_BASE_URL,
                api_key = settings.LLM_API_KEY
            )
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '未配置OpenAI API密钥'
            }))
            return

        # 调用OpenAI API生成任务
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{'role': 'user', 'content': prompt}]
        )

        # # 解析LLM响应
        tasks_content = response.choices[0].message.content.strip()
        # material_tasks = json.loads(tasks_content)

        # 保存任务到项目
        # project.material_tasks = material_tasks
        # project.save()
        await project.sync_material_tasks_from_json(tasks_content)

        await self.send(json.dumps({
            'status': 'success',
            'step': 3,
            'desc': '任务生成成功',
            'project_id': project.id
        }))

        # 关闭连接
        await self.close()


class GenerateOutline(AsyncWebsocketConsumer):

    def __init__(self, *args, **kwargs):

        self.in_process = False
        super().__init__(*args, **kwargs)


    async def _trans_related_files_to_md_list(self, material_tasks):
        # 根据给定的 material_tasks list，获取相关任务及子任务包括的 document，整理成 md 格式

        md_list = []
        for task in material_tasks:
            # 有描述则添加 name: desc 否则添加 name
            if task['desc']:
                md_list.append(f'- {task["name"]}: {task["desc"]}')
            else:
                md_list.append(f'- {task["name"]}')
            
            task_id = task['id']
            task_obj = await Material_Task.objects.aget(id=task_id)
            # 添加当前目录下的文件
            docs = Document.objects.filter(task=task_obj)
            async for d in docs:
                md_list.append(f'    - {d.name}')
            
            if 'sub_tasks' in task.keys():
                sub_docs_list = await self._trans_related_files_to_md_list(task['sub_tasks'])
                for sub_doc in sub_docs_list:
                    md_list.append(f'    {sub_doc}')

        return md_list

    async def connect(self):
        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')


    async def disconnect(self, close_code):
        print('disconnect')

    async def receive(self, text_data):
        if self.in_process == True:
            await self.send(json.dumps({
                'status': 'error',
                'message': '正在生成大纲'
            }), close=True)

        data = json.loads(text_data)
        project_id = data.get('project_id', '')
        self.in_process = True

        try:

            # 基础鉴权
            project = await Project.objects.select_related('project_template', 'ppt_template').aget(id=project_id, user=self.scope['user'])

            if project == None:
                await self.send(json.dumps({
                    'status': 'error',
                    'message': '项目不存在或无权访问'
                }, close=True))
                return
            
            if not project.material_tasks:
                await self.send(json.dumps({
                    'status': 'error',
                    'message': '请先生成材料收集任务'
                }, close=True))
                return

            
            await self.send(json.dumps({
                'status': 'doing',
                'step': 1,
                'desc': '收集对应的材料'
            }))

            # 获取相关文件
            md_files_list = await self._trans_related_files_to_md_list(project.material_tasks)
            related_files = '\n'.join(md_files_list)

            await self.send(json.dumps({
                'status': 'doing',
                'step': 2,
                'desc': '正在生成大纲'
            }))

            # 如果项目当前的 outline 不为空，获取当前模板
            if project.outline:
                default_outline = project.outline
            elif project.project_template:
                project_template = await Project_Template.objects.aget(id=project.project_template.id)
                default_outline = project_template.default_outline
            else:
                default_outline = []


            # 配置OpenAI客户端
            try:
                client = AsyncOpenAI(
                    base_url = settings.LLM_BASE_URL,
                    api_key = settings.LLM_API_KEY
                )
            except:
                await self.send(json.dumps({
                    'status': 'error',
                    'message': '未配置OpenAI API密钥'
                }), close=True)
                return

            await self.send(json.dumps({
                'status': 'doing',
                'step': 2,
                'desc': '正在生成大纲'
            }))
            
            # 生成LLM提示词
            curdir = os.getcwd()
            prompt_file_path = os.path.join(curdir, 'prompts', 'generate_outline.md')
            with open(prompt_file_path, 'r', encoding='utf-8') as f:
                prompt = f.read()
        
            prompt = (
                prompt.replace('{theme}', project.theme)
                .replace('{audience}', project.audience)
                .replace('{place}', project.place)
                .replace('{duration}', str(project.duration))
                .replace('{target}', project.target)
                .replace('{related_files}', related_files)
                .replace('{default_outline}', json.dumps(default_outline, ensure_ascii=False))
            )


            # 调用OpenAI API生成任务
            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{'role': 'user', 'content': prompt}]
            )

            # # 解析LLM响应
            tasks_content = response.choices[0].message.content.strip()
            await self.send(json.dumps({
                'status': 'doing',
                'step': 3,
                'desc': '进行数据解析',
                'text': tasks_content
            }))
            
            outline = await project.sync_ppt_pages_from_json(tasks_content)


            await self.send(json.dumps({
                'status': 'success',
                'step': 4,
                'desc': '大纲生成成功',
                'tasks_content': outline
            }), close=True)


        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'AI返回的任务格式不是有效的JSON'
            }), close=True)
        # except OpenAI.error.OpenAIError as e:
        #     await self.send(json.dumps({
        #         'status': 'error',
        #         'message': f'OpenAI API调用失败: {str(e)}'
        #     }), close=True)
        except Exception as e:
            await self.send(json.dumps({
                'status': 'error',
                'message': f'大纲创建失败: {str(e)}'
            }), close=True)

            raise e


class AutoDocRelations(AsyncWebsocketConsumer):

    def llm_response_to_dict(self, response):

        response = response.replace('```', '')
        response = response.replace('```json', '')

        try:
            response = json.loads(response)
        except:
            response = []
        
        return response

    def filter_result(self, query_result):

        filtered_result = {
            'ids': [],
            'metadatas': [],
            'documents': [],
            'distances': [],
        }
        min_distance = min(query_result['distances'])

        doc_list = []
        # 如果最小距离大于0.5，直接返回空结果
        if min_distance > 0.5:
            return doc_list

        # 筛选距离最小距离不超过参数的结果
        for i in range(len(query_result['distances'])):
            if query_result['distances'][i] - min_distance < 0.1 and query_result['distances'][i] < 0.5:
                filtered_result['ids'].append(query_result['ids'][i])
                filtered_result['metadatas'].append(query_result['metadatas'][i])
                filtered_result['documents'].append(query_result['documents'][i])
                filtered_result['distances'].append(query_result['distances'][i])
        
        for i in range(len(filtered_result['ids'])):
            doc_list.append({
                'id': int(filtered_result['ids'][i]),
                'name': filtered_result['metadatas'][i]['name'],
                'distance': filtered_result['distances'][i],
            })
        return doc_list

    async def connect(self):
        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')


    async def disconnect(self, close_code):
        print('disconnect')

    async def receive(self, text_data):

        method = PROJECT_CONFIG.get('EMBEDDING', 'METHOD').lower()
        if method == 'chroma':
            await self.receive_chroma(text_data)
        else:
            await self.receive_llm(text_data)

    async def receive_chroma(self, text_data):
        try:
            data = json.loads(text_data)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return
        
        project_id = data.get('project_id', '')
        project = await Project.objects.select_related('user').aget(id=project_id)

        if not project and project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        if not project.doc_db_updated:
            await self.send(json.dumps({
                'status': 'doing',
                'message': '更新向量数据库'
            }))
            await sync_to_async(project.update_doc_db)()

        vector_db = Chroma_Driver(collection_name=f'project_{project.id}_doc')
        # 准备针对叶子节点，进行遍历
        leaf_nodes = project.get_all_leaf_nodes(project.outline)
        for i in range(len(leaf_nodes)):

            ppt_page_dict = leaf_nodes[i]
            try:
                ppt_page = await PPt_Page.objects.aget(id=ppt_page_dict['id'], p_type='content')
            except:
                continue

            await self.send(json.dumps({
                'status': 'doing',
                'message': f'({i+1}/{len(leaf_nodes)}) 正在处理 {ppt_page.name}'
            }))
            outline_path_list = project.get_outline_path_by_id(ppt_page.id)
            outline_path = '/'.join(outline_path_list)

            result = vector_db.query(query_text=outline_path, n_results=10)
            doc_list = self.filter_result(result)

            # 删除旧的关联，增加新的关联
            await Page_and_Doc.objects.filter(ppt_page=ppt_page).filter(type='auto').adelete()
            for doc in doc_list:
                doc_obj = await Document.objects.aget(id=doc['id'])
                if doc_obj:
                    await Page_and_Doc.objects.acreate(
                        ppt_page=ppt_page,
                        document=doc_obj,
                        type='auto'
                    )

        await self.send(json.dumps({
            'status': 'success',
            'message': '创建完成',
        }), close=True)


    async def receive_llm(self, text_data):

        try:
            data = json.loads(text_data)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return
        
        project_id = data.get('project_id', '')
        project = await Project.objects.select_related('user').aget(id=project_id)

        if not project and project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        await self.send(json.dumps({
                'status': 'doing',
                'desc': '收集对应的材料'
            }))
        # 获取素材文件
        doc_dict = await project._material_files_to_dict()
        # 获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_related_files.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()

        # 配置OpenAI客户端
        try:
            client = AsyncOpenAI(
                base_url = settings.LLM_BASE_URL,
                api_key = settings.LLM_API_KEY
            )
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '未配置OpenAI API密钥'
            }))
            return

        # 准备针对叶子节点，进行遍历
        leaf_nodes = project.get_all_leaf_nodes(project.outline)
        for i in range(len(leaf_nodes)):

            ppt_page_dict = leaf_nodes[i]
            try:
                ppt_page = await PPt_Page.objects.aget(id=ppt_page_dict['id'], p_type='content')
            except:
                continue

            if not ppt_page: continue

            await self.send(json.dumps({
                'status': 'doing',
                'message': f'({i+1}/{len(leaf_nodes)}) 正在处理 {ppt_page.name}'
            }))
            outline_path_list = project.get_outline_path_by_id(ppt_page.id)
            outline_path = '/'.join(outline_path_list)

            print(ppt_page)
            print(outline_path)

        
            prompt = (
                prompt_temp.replace('{theme}', project.theme)
                .replace('{audience}', project.audience)
                .replace('{place}', project.place)
                .replace('{duration}', str(project.duration))
                .replace('{target}', project.target)
                .replace('{keyword}', outline_path)
                .replace('{related_files}', json.dumps(doc_dict))
            )

            print(prompt)

            # 调用OpenAI API生成任务
            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{'role': 'user', 'content': prompt}]
            )

            # 解析LLM响应
            response = response.choices[0].message.content.strip()
            doc_list = self.llm_response_to_dict(response)

            print(doc_list)

            # 删除旧的关联，增加新的关联
            await Page_and_Doc.objects.filter(ppt_page=ppt_page).filter(type='auto').adelete()
            for doc in doc_list:
                doc_obj = await Document.objects.aget(id=doc['id'])
                if doc_obj:
                    await Page_and_Doc.objects.acreate(
                        ppt_page=ppt_page,
                        document=doc_obj,
                        type='auto'
                    )

        await self.send(json.dumps({
            'status': 'success',
            'message': '创建完成',
        }), close=True)

class GenerateFullText(AsyncWebsocketConsumer):

    async def connect(self):

        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')
    

    async def disconnect(self, close_code):
        print('disconnect')
    

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return

        
        project_id = data.get('project_id')
        project = await Project.objects.select_related('user').aget(id=project_id)

        if not project or project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        # 从 generate_full_text.md 中获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_full_text.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()

        leaf_nodes = project.get_all_leaf_nodes(project.outline)

        for i in range(len(leaf_nodes)):

            ppt_page_dict = leaf_nodes[i]
            try:
                ppt_page = await PPt_Page.objects.aget(id=ppt_page_dict['id'], p_type='content')
            except:
                continue

            await self.send(json.dumps({
                'status': 'doing',
                'message': f'({i+1}/{len(leaf_nodes)}) 正在处理 {ppt_page.name}'
            }))


            related_files = []
            async for rel in Page_and_Doc.objects.filter(ppt_page=ppt_page).select_related('document'):
                related_files.append({
                    'name': rel.document.name,
                    'content': rel.document.content_with_head_level(3),
                })

            # 替换 prompt 模板中的变量
            prompt = (
                prompt_temp.replace('{theme}', project.theme)
                .replace('{audience}', project.audience)
                .replace('{place}', project.place)
                .replace('{duration}', str(project.duration))
                .replace('{target}', project.target)

                .replace('{outline}', '\n'.join(project.trans_outline_to_md_list()))
                .replace('{title}', f'{ppt_page.name}: {ppt_page.description}')
                .replace('{reference_materials}', '\n\n'.join([
                    f'## {rel['name']}\n\n{rel['content']}'
                    for rel in related_files
                ]))
            )

            ppt_page.prompt = prompt
            await ppt_page.asave()
        

            # 调用 OpenAI API 生成文档
            try:
                client = AsyncOpenAI(
                    base_url = settings.LLM_BASE_URL,
                    api_key = settings.LLM_API_KEY
                )
            except:
                await self.send(json.dumps({
                    'status': 'error',
                    'message': '无法完成请求'
                }), close=True)
                return
            
            # 调用 OpenAI API 生成文档
            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{'role': 'user', 'content': prompt}]
            )

            # 解析LLM响应
            response = response.choices[0].message.content.strip()

            ppt_page.full_text = response
            await ppt_page.asave()

        await self.send(json.dumps({
            'status': 'success',
            'message': '生成完成',
        }), close=True)


class  GenerateSlideData(AsyncWebsocketConsumer):

    async def connect(self):

        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')
    
    async def disconnect(self, close_code):
        print('disconnect')

    async def request_llm(self, prompt_system, prompt):

        # 调用 OpenAI API 生成文档
        try:
            client = AsyncOpenAI(
                base_url = settings.LLM_BASE_URL,
                api_key = settings.LLM_API_KEY
            )
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '无法完成请求'
            }), close=True)
            return
        
        # 调用 OpenAI API 生成文档
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {'role': 'system', 'content': prompt_system}, 
                {'role': 'user', 'content': prompt}
            ]
        )

        # 解析LLM响应
        response = response.choices[0].message.content.strip()


        if response.startswith('```json'):
            response = response[7:-3]

        try:
            response_dict = json.loads(response)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '生成的数据有误'
            }), close=True)
            return
        
        return response_dict

    
    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return
        

        project_id = data.get('project_id')
        project = await Project.objects.select_related('user', 'ppt_template').aget(id=project_id)
        template = project.ppt_template

        if not project or project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        # 从 generate_slide_data_user.md 中获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_slide_data_user.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()


        prompt_system_file_path = os.path.join(work_dir, 'prompts', 'generate_slide_data_system.md')
        with open(prompt_system_file_path, encoding='utf-8') as f:
            prompt_system = f.read()

        
        leaf_nodes = project.get_all_leaf_nodes(project.outline)
        # 开始项目中的页面替换
        for i in range(len(leaf_nodes)):

            ppt_page_dict = leaf_nodes[i]
            try:
                ppt_page = await PPt_Page.objects.aget(id=ppt_page_dict['id'], p_type='content')
            except:
                continue

            await self.send(json.dumps({
                'status': 'doing',
                'message': f'({i+1}/{len(leaf_nodes)}) 正在处理 {ppt_page.name}'
            }))
            
            full_text = ppt_page.full_text
            if full_text == None:
                continue

            page_and_template, created = await Page_and_Template.objects.aget_or_create(ppt_page=ppt_page, ppt_template=template)
            # 根据page_and_template 中 template_id 是否为空，选择 slide_templates
            if page_and_template.template_id:
                slide_templates = [ slide_template for slide_template in template.slide_templates if slide_template['id'] == page_and_template.template_id]
            else:
                slide_templates = template.slide_templates
            
            # template_str = json.dumps(template.slide_templates, ensure_ascii=False)
            template_str = json.dumps(slide_templates, ensure_ascii=False)
            
            prompt = (
                prompt_temp.replace('{full_text}', full_text)
                .replace('{slide_templates}', template_str)
            )
            response_dict = await self.request_llm(prompt_system, prompt)    
            await Page_and_Template.objects.aupdate_or_create(
                ppt_page=ppt_page,
                ppt_template=template,
                defaults={
                    'data': response_dict
                }
            )

        await self.send(json.dumps({
            'status': 'success',
            'message': '生成完成'
        }), close=True)


class GeneratePPT(AsyncWebsocketConsumer):
    
    async def connect(self):

        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')
    
    async def disconnect(self, close_code):
        print('disconnect')

    async def request_llm(self, prompt_system, prompt):

        # 调用 OpenAI API 生成文档
        try:
            client = AsyncOpenAI(
                base_url = settings.LLM_BASE_URL,
                api_key = settings.LLM_API_KEY
            )
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '无法完成请求'
            }), close=True)
            return
        
        # 调用 OpenAI API 生成文档
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {'role': 'system', 'content': prompt_system}, 
                {'role': 'user', 'content': prompt}
            ]
        )

        # 解析LLM响应
        response = response.choices[0].message.content.strip()


        if response.startswith('```json'):
            response = response[7:-3]

        try:
            response_dict = json.loads(response)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '生成的数据有误'
            }), close=True)
            return
        
        return response_dict

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return


        project_id = data.get('project_id')
        project = await Project.objects.select_related('ppt_template').aget(id=project_id, user=self.scope['user'])
        if not project:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return
        template = project.ppt_template
        
        ppt_generate, created = await PPt_Generate.objects.aget_or_create(
            project=project,
            defaults={'current_stage': 'file_generation'}
        )

        # 用 temp_file 是因为无法在中间文件不存在时，获取中间文件的路径
        temp_file_path = await ppt_generate.get_temp_file_path()
        # 如果 temp_file_path 存在，删除
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        ppt_generator = PPt_Generator(temp_file_path, template)

        await self.send(json.dumps({
                'status': 'doing',
                'message': '获取页面数据'
            }))


        # # 获取标题页
        # title_page = await PPt_Page.objects.aget(project=project, name='标题', p_type='construct')
        # try:
        #     title_page_and_temp = await Page_and_Template.objects.aget(ppt_page=title_page)
        #     if not title_page_and_temp.data:
        #         raise Exception('数据不存在')
        # except:
        #     await self.send(json.dumps({
        #         'status': 'error',
        #         'message': '标题页数据不存在'
        #     }), close=True)
        #     return
        
        # # 获取目录页
        # toc_page = await PPt_Page.objects.aget(project=project, name='目录', p_type='construct')
        # try:
        #     toc_page_and_temp = await Page_and_Template.objects.aget(ppt_page=toc_page)
        #     if not toc_page_and_temp.data:
        #         raise Exception('数据不存在')
        # except:
        #     await self.send(json.dumps({
        #         'status': 'error',
        #         'message': '目录页数据不存在'
        #     }), close=True)
        #     return

        # 从 generate_slide_data_user.md 中获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_slide_data_user.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()


        prompt_system_file_path = os.path.join(work_dir, 'prompts', 'generate_slide_data_system.md')
        with open(prompt_system_file_path, encoding='utf-8') as f:
            prompt_system = f.read()

        # 先生成标题页
        await self.send(json.dumps({
                'status': 'doing',
                'message': f'正在处理标题页'
            }))
        title_page, created = await PPt_Page.objects.aget_or_create(
            project=project,
            p_type='construct',
            name='标题'
        )

        # 替换 prompt 模板中的变量
        prompt = (
            prompt_temp.replace('{full_text}', f'项目主题：{project.theme}')
            .replace('{slide_templates}', json.dumps(template.cover_template, ensure_ascii=False))
        )

        response_dict = await self.request_llm(prompt_system, prompt)

        title_page_and_temp, created = await Page_and_Template.objects.aupdate_or_create(
            ppt_page=title_page,
            ppt_template=template,
            defaults={
                'data': response_dict
            }
        )
        ppt_generator.add_slide(response_dict)
        

        flatten_outline = project.flatten_outline()
        # 生成目录
        await self.send(json.dumps({
                'status': 'doing',
                'message': f'正在生成目录'
            }))
        toc_page, created = await PPt_Page.objects.aget_or_create(
            project=project,
            p_type='construct',
            name='目录'
        )
        titles_L1 = [ o for o in flatten_outline if o['level'] == 1]
        # title_no = 1
        # toc = ''
        # for o in titles_L1:
        #     toc += f'{title_no}. {o["name"]}\n'
        #     title_no += 1
        
        # prompt = (
        #     prompt_temp.replace('{full_text}', toc)
        #     .replace('{slide_templates}', json.dumps(template.toc_template))
        # )

        # response_dict = await self.request_llm(prompt_system, prompt)
        toc_components_list = []
        toc_no = 1
        for o in titles_L1:
            toc_components_list.append(
                toc_component_temp.replace('{title}', o['name']).replace('{number}', str(toc_no))
            )
            toc_no += 1
        response_str = (
            toc_data_temp
            .replace('{toc_components}', ', '.join(toc_components_list))
            .replace('{template_id}', str(template.toc_template['id']))
        )
        
        response_dict = json.loads(response_str)

        toc_page_and_temp, created = await Page_and_Template.objects.aupdate_or_create(
            ppt_page=toc_page,
            ppt_template=template,
            defaults={
                'data': response_dict
            }
        )
        ppt_generator.add_slide(toc_page_and_temp.data)
        
        # 生成章节页和内容页
        no_L1 = 0
        no_L2 = 0
        for i in range(len(flatten_outline)):

            ppt_page_dict = flatten_outline[i]
            try:
                ppt_page = await PPt_Page.objects.aget(id=ppt_page_dict['id'])
            except:
                continue

            await self.send(json.dumps({
                'status': 'doing',
                'message': f'({i+1}/{len(flatten_outline)}) 正在处理 {ppt_page.name}'
            }))
            

            # 章节页面
            if 'chapter' in ppt_page_dict.keys():
                level = ppt_page_dict['level']
                if level == 1: 
                    no_L1 += 1
                    template_str = json.dumps(template.chapter_L1_template, ensure_ascii=False)
                    full_text = f'{no_L1} {ppt_page.name}'
                elif level == 2: 
                    no_L2 += 1
                    template_str = json.dumps(template.chapter_L2_template, ensure_ascii=False)
                    full_text = f'{no_L1}.{no_L2} {ppt_page.name}'

                prompt = (
                    prompt_temp.replace('{full_text}', full_text)
                    .replace('{slide_templates}', template_str)
                )
                response_dict = await self.request_llm(prompt_system, prompt)    
                page_and_temp, created = await Page_and_Template.objects.aupdate_or_create(
                    ppt_page=ppt_page,
                    ppt_template=template,
                    defaults={
                        'data': response_dict
                    }
                )
                ppt_generator.add_slide(response_dict, full_text)

            # 叶子节点
            else:
                try:
                    ppt_page_and_temp = await Page_and_Template.objects.aget(
                        ppt_page=ppt_page,
                        ppt_template=template
                    )
                    data = ppt_page_and_temp.data
                    empty = False
                except:
                    empty = True
                
                if data == {} or data == None or data == [] or empty == True:
                    # 没有 slide_data
                    temp = template.blank_template.copy()
                    if 'placeholders' in temp.keys() and len(temp['placeholders']) > 0:
                        temp['placeholders'][0]['content'] = ppt_page.name
                    temp['template_id'] = temp['id']
                    data = temp

                slide_note = ppt_page.name
                if ppt_page.description: 
                    slide_note += f'\n{ppt_page.description}'
                if ppt_page.full_text:
                    slide_note += f'\n\n{ppt_page.full_text}'
                ppt_generator.add_slide(data, slide_note)
        
        # 图片替换
        i = 1
        async for _ in ppt_generator.batch_replace_multimedia():
            await self.send(json.dumps({
                'status': 'doing',
                'message': f'正在替换第 {i} 页的图片'
            }))
            i += 1

        await self.send(json.dumps({
            'status': 'doing',
            'message': '保存文件'
        }))

        blob = ppt_generator.save_and_export_blob() # 文件保存到了 temp_file_path
        with open(temp_file_path, 'rb') as f:
            temp_file_content = File(f)
            await sync_to_async(ppt_generate.intermediate_file.save)('', temp_file_content)

        ppt_generate.current_stage = 'multimedia_processing'
        await ppt_generate.asave()

        await self.send(json.dumps({
            'status': 'success',
            'message': '生成完成',
            'file': base64.b64encode(blob).decode('utf-8'),
            'file_name': project.name + '_intermediate.pptx'
        }), close=True)


class MultimediaProcessing(AsyncWebsocketConsumer):
    
    async def connect(self):

        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')
    
    async def disconnect(self, close_code):
        print('disconnect')

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return


        project_id = data.get('project_id')
        project = await Project.objects.select_related('ppt_template').aget(id=project_id, user=self.scope['user'])
        if not project:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        # 获取 ppt_generate
        try:
            ppt_generate = await PPt_Generate.objects.aget(project=project)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        # 获取文件
        file = data.get('file')
        if not file:
            await self.send(json.dumps({
                'status': 'error',
                'message': '文件不存在'
            }), close=True)
            return
        
        # 保存文件
        # data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,
        base64_str = file.split(',', 1)[1]
        intermediate_file = ppt_generate.intermediate_file.path
        with open(intermediate_file, 'wb') as f:
            f.write(base64.b64decode(base64_str))
        
        # 替换文件
        ppt_generator = PPt_Generator(intermediate_file, project.ppt_template)
        i = 1
        async for _ in ppt_generator.batch_replace_multimedia():
            await self.send(json.dumps({
                'status': 'doing',
                'message': f'正在替换第 {i} 页的图片'
            }))
            i += 1

        await self.send(json.dumps({
            'status': 'doing',
            'message': f'正在获取文件'
        }))


        try:
            blob = ppt_generator.save_and_export_blob()
            await self.send(json.dumps({
                'status': 'success',
                'message': '生成完成',
                'file': base64.b64encode(blob).decode('utf-8'),
                'file_name': project.name + '_intermediate.pptx'
            }), close=True)
        except Exception as e:
            await self.send(json.dumps({
                'status': 'error',
                'message': str(e)
            }), close=True)


class GenerateFinalPPT(AsyncWebsocketConsumer):
    
    async def connect(self):

        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')
    
    async def disconnect(self, close_code):
        print('disconnect')

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return


        project_id = data.get('project_id')
        project = await Project.objects.select_related('ppt_template').aget(id=project_id, user=self.scope['user'])
        if not project:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return
        
        try:
            ppt_generate = await PPt_Generate.objects.aget(project=project)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        intermediate_file = ppt_generate.intermediate_file.path
        ppt_generator = PPt_Generator(intermediate_file, project.ppt_template)

        await self.send(json.dumps({
            'status': 'doing',
            'message': '正在清理中间数据'
        }))
        ppt_generator.batch_clear_slide()
        temp_file_path = await ppt_generate.get_temp_file_path()
        blob = ppt_generator.save_and_export_blob(temp_file_path)

        with open(temp_file_path, 'rb') as f:
            temp_file_content = File(f)
            await sync_to_async(ppt_generate.final_file.save)('', temp_file_content)
        
        ppt_generate.current_stage = 'final_file'
        await ppt_generate.asave()

        await self.send(json.dumps({
            'status': 'success',
            'message': '生成完成',
            'file': base64.b64encode(blob).decode('utf-8'),
            'file_name': project.name + '_final.pptx'
        }), close=True)


class DownloadFinalPPT(AsyncWebsocketConsumer):
    
    async def connect(self):

        # 检查用户是否登录
        if not self.scope['user'].is_authenticated:
            await self.close()
            return
        
        await self.accept()
        print('connect')
    
    async def disconnect(self, close_code):
        print('disconnect')

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return


        project_id = data.get('project_id')
        project = await Project.objects.select_related('ppt_template').aget(id=project_id, user=self.scope['user'])
        if not project:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目不存在'
            }), close=True)
            return

        try:
            ppt_generate = await PPt_Generate.objects.aget(project=project, current_stage='final_file')
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '项目未生成最终文件'
            }), close=True)
            return
        
        final_file_path = ppt_generate.final_file.path
        with open(final_file_path, 'rb') as f:
            blob = f.read()

        await self.send(json.dumps({
            'status': 'success',
            'message': '下载完成',
            'file': base64.b64encode(blob).decode('utf-8'),
            'file_name': project.name + '_final.pptx'
        }), close=True)

