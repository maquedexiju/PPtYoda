import os
from openai import OpenAI
from pydoll.browser import Chrome
from pydoll.browser.options import ChromiumOptions
import browsercookie
# import rookiepy
import re
import time
import subprocess
import asyncio

from datetime import datetime

from ppt_killer.settings import PROJECT_CONFIG


class Web_Browser:

    def __init__(self):

        self.browser = Chrome(connection_port=9222)

    def _get_cookies(self, reg_str=''):
        Chrome = browsercookie.Chrome()
        # Chrome = rookiepy.chrome()
        file_path = Chrome.find_cookie_files() # Chrome 的 cookie 地址
        cookies = Chrome.get_cookies() # 获取 cookie

        cookie_list = []
        if reg_str:
            reg = re.compile(reg_str)
        else:
            reg = None
        for c in cookies:
            if c.name.startswith('__'):
            # name = c.name.lower()
            # if name.startswith('__host') or c.name.startswith('__secure'):
                continue
            if reg and not reg.search(c.domain):
                continue

            d = dict(
                name=c.name,
                value=c.value,
                domain=c.domain,
                path=c.path,
                expires=c.expires,
            )
            cookie_list.append(d)

        return cookie_list

    def _run_chrome(self):

        # 获取工作目录
        workdir = os.getcwd()
        user_data_dir = os.path.join(workdir, 'chrome-data')
        binary_location = Chrome._get_default_binary_location()
        options = f'--user-data-dir="{user_data_dir}" --remote-debugging-port=9222 --no-first-run'
        # options = '--remote-debugging-port=9222 --no-first-run'

        # 如果是 mac 且 arm
        if 'uname' in os.__dict__:
            if os.uname().sysname == 'Darwin' and os.uname().machine == 'arm64':
                command = f'exec arch -arm64 "{binary_location}" {options}'
            else:
                command = f'"{binary_location}" {options}'
        else:
            command = f'"{binary_location}" {options}'

        # os.system(command)
        subprocess.Popen(command, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    async def _check_port_unix(self, port):
        command = ['lsof', '-i', f':{port}']
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0:
            return True
        
    async def _check_port_win(self, port):
        try:
            # 使用 netstat 命令查找 TCP 和 UDP 端口
            result = subprocess.run(
                ["netstat", "-ano"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True
            )
            
            # 遍历输出行，查找匹配的端口号
            for line in result.stdout.splitlines():
                if f":{port} " in line:
                    return True
            
            return False
        
        except subprocess.CalledProcessError as e:
            print("执行 netstat 命令失败:", e)
            return False

    async def _check_chrome(self):
    
        # 查看 9222 端口服务是否开启
        if os.name == 'nt': check_command = self._check_port_win
        else: check_command = self._check_port_unix

        while True:
            if check_command(9222): 
                break
            await asyncio.sleep(1)
            print('等待浏览器启动...')
        
        while True:
            try:
                window_id = await self.browser.get_window_id()
                if window_id:
                    break
            except:
                await asyncio.sleep(1)


    async def start_browser(self):

        if not await self.browser._is_browser_running():
            self._run_chrome()
            await self._check_chrome()

    async def _choose_llm(self):

        llm = PROJECT_CONFIG.get('LLM', 'HELPER')
        if llm == 'coze':
            from .coze_launcher import Coze_Launcher
            launcher = Coze_Launcher()
        elif llm == 'lanzhi':
            from .lanzhi_launcher import Lanzhi_Launcher
            launcher = Lanzhi_Launcher()
        elif llm == 'doubao':
            from .doubao_launcher import Doubao_Launcher
            launcher = Doubao_Launcher()

        return launcher

    async def _create_tab(self):

        try:
            # 加载 cookie
            cookie_list = self._get_cookies(llm)
        except:
            cookie_list = []

        # 创建浏览器上下文
        # context_id = await self.browser.create_browser_context()
        tab = await self.browser.new_tab()#browser_context_id=context_id)
        if cookie_list != []:
            await self.browser.set_cookies(cookie_list)#, browser_context_id=context_id)
        
        return tab

    async def start_material_collect(self, prompt, url, api_key, task_id, task_path):
        
        api_key = str(api_key)
        task_id = str(task_id)
        
        # 创建 tab
        tab = await self._create_tab()

        # 选择 LLM
        launcher = await self._choose_llm()
        await launcher.start_material_collect(tab, prompt, url, api_key, task_id, task_path)

        return 'ok'


    async def start_fulltext_edit(self, prompt, url, api_key, task_id):
        
        api_key = str(api_key)
        task_id = str(task_id)
        
        # 创建 tab
        tab = await self._create_tab()

        # 选择 LLM
        launcher = await self._choose_llm()
        await launcher.start_fulltext_edit(tab, prompt, url, api_key, task_id)

        return 'ok'
