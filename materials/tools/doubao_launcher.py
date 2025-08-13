import os
from datetime import datetime

task_prompt = '''
我正在准备一个 PPt 材料：

* 主题：{theme}
* 受众: {audience}
* 场所：{place}
* 时长：{duration}
* 目标：
{target}

目前我正在 {process}

请帮我获取相关信息
'''

class Doubao_Launcher:
    def __init__(self):
        pass


    async def _launch(self, tab, prompt):

        self.tab = tab
        print('启动豆包')
        await tab.go_to('https://www.doubao.com/chat/')
        print('进入豆包')

        # 输入任务背景
        input_div = await tab.query('//textarea[@data-testid="chat_input_input"]', timeout=120)#, raise_exec=True)
        await input_div.click()
        await input_div.insert_text(prompt)

    async def start_material_collect(self, tab, prompt, url, api_key, task_id, task_path):

        await self._launch(tab, prompt)

        # 加载脚本
        js_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'doubao_helper.js')
        with open(js_path, 'r', encoding='utf-8') as f:
            js_code = f.read()
            js_code = (
                js_code.replace('{API_KEY}',  str(api_key))
                .replace('{URL}', url)
                .replace('{TASK_ID}', str(task_id))
                .replace('{TASK_PATH}', task_path)
            )
        await tab.execute_script(js_code)

    
    async def start_fulltext_edit(self, tab, prompt, url, api_key, task_id):

        await self._launch(tab, prompt)

        # 加载脚本
        js_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'doubao_fulltext_edit.js')
        with open(js_path, 'r', encoding='utf-8') as f:
            js_code = f.read()
            js_code = (
                js_code.replace('{API_KEY}',  str(api_key))
                .replace('{URL}', url)
                .replace('{TASK_ID}', str(task_id))
            )
        await tab.execute_script(js_code)