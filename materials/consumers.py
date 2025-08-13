import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .tools.web_browser import Web_Browser
from .models import Material_Task
import os

class StartAIHelper(AsyncWebsocketConsumer):
    
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

        # 接收数据
        try:
            data = json.loads(text_data)
            print(data)
        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': '数据格式错误'
            }), close=True)
            return
        
        # 处理数据
        task_id = data.get('task_id')
        if not task_id:
            await self.send(json.dumps({
                'status': 'error',
                'message': '参数错误'
            }), close=True)
            return

        await self.send(json.dumps({
                'status': 'doing',
                'message': '获取任务信息'
            }))
        # 获取任务并检查权限
        try:
            task = await Material_Task.objects.select_related('project', 'project__user').aget(id=task_id)
        except Material_Task.DoesNotExist:
            await self.send(json.dumps({
                'status': 'error',
                'message': '任务不存在'
            }), close=True)
            return

        if task.project.user != self.scope['user']:
            await self.send(json.dumps({
                'status': 'error',
                'message': '任务不存在'
            }), close=True)
            return

        project = task.project
        user = project.user
        api_key = user.api_key

        # 获取 prompt
        work_dir = os.getcwd()
        prompt_file_path = os.path.join(work_dir, 'prompts', 'ai_helper.md')

        with open(prompt_file_path, encoding='utf-8') as f:
            prompt_temp = f.read()

        task_path = '=>'.join(project.get_material_task_path(task_id))
        
        prompt = (
            prompt_temp.replace('{theme}', project.theme)
            .replace('{audience}', project.audience)
            .replace('{place}', project.place)
            .replace('{duration}', str(project.duration))
            .replace('{target}', project.target)
            .replace('{tasks}', task_path)
        )
    
        # 调用 AI 助手
        await self.send(json.dumps({
                'status': 'doing',
                'message': '打开浏览器'
            }))

        # 获取当前服务链接
        server_host, server_port = self.scope['server']
        url = f'http://{server_host}:{server_port}'
        web_browser = Web_Browser()
        await web_browser.start_browser()

        await self.send(json.dumps({
                'status': 'doing',
                'message': '打开 AI 空间'
            }))
        await web_browser.start_material_collect(prompt, url, api_key, task_id, task_path)

        await self.send(json.dumps({
                'status': 'success',
                'message': '请在 AI 空间中完成操作'
            }), close=True)