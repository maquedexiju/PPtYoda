import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from asgiref.sync import sync_to_async

from openai import AsyncOpenAI
import os

# 导入 settings
from ppt_killer.settings import PROJECT_CONFIG

from .models import PPt_Page, Page_and_Doc, Page_and_Template
from materials.models import Document
from project_manage.models import Project
from knowledge_base.tools.chroma_driver import Chroma_Driver
from materials.tools.web_browser import Web_Browser

import asyncio

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
        # 如果最小距离大于0.5，直接返回空结果
        doc_list = []
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
                'id': filtered_result['ids'][i],
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
        
        ppt_page_id = data.get('ppt_page_id')
        ppt_page = await PPt_Page.objects.select_related('project', 'project__user').aget(id=ppt_page_id, p_type='content')

        if not ppt_page and ppt_page.project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'PPT页面不存在'
            }), close=True)
            return

        project = ppt_page.project
        outline_path_list = project.get_outline_path_by_id(ppt_page_id)
        outline_path = '/'.join(outline_path_list)

        if not project.doc_db_updated:

            await self.send(json.dumps({
                'status': 'doing',
                'message': '更新向量数据库'
            }))

            await sync_to_async(project.update_doc_db)()
        
        await self.send(json.dumps({
            'status': 'doing',
            'message': '进行文档筛选'
        }))

        vector_db = Chroma_Driver(collection_name=f'project_{project.id}_doc')
        result = vector_db.query(query_text=outline_path, n_results=10)

        doc_list = self.filter_result(result)

        await Page_and_Doc.objects.filter(ppt_page=ppt_page).filter(type='auto').adelete()
        for doc in doc_list:
            doc_obj = await Document.objects.aget(id=doc['id'])
            if doc_obj:
                await Page_and_Doc.objects.acreate(
                    ppt_page=ppt_page,
                    document=doc_obj,
                    type='auto'
                )

        related_files = []
        async for rel in Page_and_Doc.objects.filter(ppt_page=ppt_page).select_related('document'):
            related_files.append({
                'id': rel.document.id,
                'name': rel.document.name,
                'type': rel.type
            })
        
        await self.send(json.dumps({
            'status': 'success',
            'desc': '创建完成',
            'related_files': related_files
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
        
        ppt_page_id = data.get('ppt_page_id')
        ppt_page = await PPt_Page.objects.select_related('project', 'project__user').aget(id=ppt_page_id, p_type='content')

        if not ppt_page and ppt_page.project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'PPT页面不存在'
            }), close=True)
            return

        project = ppt_page.project
        outline_path_list = project.get_outline_path_by_id(ppt_page_id)
        outline_path = '/'.join(outline_path_list)

        await self.send(json.dumps({
            'status': 'doing',
            'step': 1,
            'desc': '获取所有文档'
        }))

        doc_dict = await project._material_files_to_dict()

        await self.send(json.dumps({
            'status': 'doing',
            'step': 2,
            'desc': '筛选文档'
        }))

        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_related_files.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()
        
        prompt = (
            prompt_temp.replace('{theme}', project.theme)
            .replace('{audience}', project.audience)
            .replace('{place}', project.place)
            .replace('{duration}', str(project.duration))
            .replace('{target}', project.target)
            .replace('{keyword}', outline_path)
            .replace('{related_files}', json.dumps(doc_dict, ensure_ascii=False))
        )

        ppt_page.prompt = prompt
        await ppt_page.asave()

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

        # 解析LLM响应
        response = response.choices[0].message.content.strip()
        doc_list = self.llm_response_to_dict(response)

        await self.send(json.dumps({
            'status': 'doing',
            'step': 3,
            'desc': '创建文档关联关系'
        }))


        await Page_and_Doc.objects.filter(ppt_page=ppt_page).filter(type='auto').adelete()
        for doc in doc_list:
            doc_obj = await Document.objects.aget(id=doc['id'])
            if doc_obj:
                await Page_and_Doc.objects.acreate(
                    ppt_page=ppt_page,
                    document=doc_obj,
                    type='auto'
                )

        related_files = []
        async for rel in Page_and_Doc.objects.filter(ppt_page=ppt_page).select_related('document'):
            related_files.append({
                'id': rel.document.id,
                'name': rel.document.name,
                'type': rel.type
            })
        
        await self.send(json.dumps({
            'status': 'success',
            'desc': '创建完成',
            'related_files': related_files
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

        
        ppt_page_id = data.get('ppt_page_id')
        ppt_page = await PPt_Page.objects.select_related('project', 'project__user').aget(id=ppt_page_id, p_type='content')

        if not ppt_page or ppt_page.project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'PPT页面不存在'
            }), close=True)
            return

        # 获取相关文档
        await self.send(json.dumps({
            'status': 'doing',
            'step': 1,
            'desc': '获取相关文档'
        }))
        related_files = []
        async for rel in Page_and_Doc.objects.filter(ppt_page=ppt_page).select_related('document'):
            related_files.append({
                'name': rel.document.name,
                'content': rel.document.content_with_head_level(3),
            })
        
        # 生成文档
        await self.send(json.dumps({
            'status': 'doing',
            'step': 2,
            'desc': '生成文字'
        }))

        # 从 generate_full_text.md 中获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_full_text.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()

        # 替换 prompt 模板中的变量
        project = ppt_page.project
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
            'desc': '生成完成',
            'full_text': response
        }), close=True)


class StartFullTextAIHelper(AsyncWebsocketConsumer):

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

        
        ppt_page_id = data.get('ppt_page_id')
        ppt_page = await PPt_Page.objects.select_related('project', 'project__user').aget(id=ppt_page_id, p_type='content')

        if not ppt_page or ppt_page.project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'PPT页面不存在'
            }), close=True)
            return

        # 获取相关文档
        await self.send(json.dumps({
            'status': 'doing',
            'step': 1,
            'desc': '获取相关文档'
        }))
        related_files = []
        async for rel in Page_and_Doc.objects.filter(ppt_page=ppt_page).select_related('document'):
            related_files.append({
                'name': rel.document.name,
                'content': rel.document.content_with_head_level(3),
            })
        
        # 生成文档
        await self.send(json.dumps({
            'status': 'doing',
            'step': 2,
            'desc': '生成文字'
        }))

        # 从 generate_full_text.md 中获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_full_text.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()

        # 替换 prompt 模板中的变量
        project = ppt_page.project
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
        
        # 调用 AI 助手
        await self.send(json.dumps({
                'status': 'doing',
                'message': '打开浏览器'
            }))

        # 获取当前服务链接
        server_host, server_port = self.scope['server']
        url = f'http://{server_host}:{server_port}'
        api_key = self.scope['user'].api_key
        web_browser = Web_Browser()
        await web_browser.start_browser()

        await self.send(json.dumps({
                'status': 'doing',
                'message': '打开 AI 空间'
            }))
        await web_browser.start_fulltext_edit(prompt, url, api_key, ppt_page.id)

        await self.send(json.dumps({
                'status': 'success',
                'message': '请在 AI 空间中完成操作'
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
    
    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return
        

        ppt_page_id = data.get('ppt_page_id')
        ppt_page = await PPt_Page.objects.select_related('project', 'project__user', 'project__ppt_template').aget(id=ppt_page_id, p_type__in=['content', 'construct'])

        if not ppt_page or ppt_page.project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'PPT页面不存在'
            }), close=True)
            return

        # 获取基本信息
        await self.send(json.dumps({
            'status': 'doing',
            'message': '获取基本信息'
        }))

        template = ppt_page.project.ppt_template
        full_text = ppt_page.full_text

        # 根据page_and_template 中 template_id 是否为空，选择 slide_templates
        try:
            page_and_template = await Page_and_Template.objects.aget(ppt_page=ppt_page, ppt_template=template)
        except:
            page_and_template = Page_and_Template(ppt_page=ppt_page, ppt_template=template)

        if page_and_template and page_and_template.template_id:
            slide_templates = [ slide_template for slide_template in template.slide_templates if slide_template['id'] == page_and_template.template_id]
        else:
            slide_templates = template.slide_templates

        # 生成文档
        await self.send(json.dumps({
            'status': 'doing',
            'messge': '生成数据'
        }))

        # 从 generate_slide_data_user.md 中获取 prompt 模板
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'generate_slide_data_user.md')
        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()

        # 替换 prompt 模板中的变量
        project = ppt_page.project
        prompt = (
            prompt_temp.replace('{full_text}', full_text)
            .replace('{slide_templates}', json.dumps(slide_templates, ensure_ascii=False))
        )

        prompt_system_file_path = os.path.join(work_dir, 'prompts', 'generate_slide_data_system.md')
        with open(prompt_system_file_path, encoding='utf-8') as f:
            prompt_system = f.read()

        with open('tmp_slide_data_gen.md', 'w') as f:
            f.write(prompt_system)
            f.write('\n\n')
            f.write(prompt)

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

        # await Page_and_Template.objects.aupdate_or_create(
        #     ppt_page=ppt_page,
        #     ppt_template=template,
        #     defaults={
        #         'data': response_dict
        #     }
        # )
        page_and_template.data = response_dict
        await page_and_template.asave()

        await self.send(json.dumps({
            'status': 'success',
            'message': '生成完成',
            'slide_data': response
        }), close=True)