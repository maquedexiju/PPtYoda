import json
import logging
from openai import AsyncOpenAI
from ..models import PPt_Template

from django.conf import settings

class Slide_Data_Generator:
    '''
    读取模板对象和样式，根据给定的页面内容生成页面
    '''

    def __init__(self, template: PPt_Template, logger: logging.Logger) -> None:

        self.template = template
        self.template_str = json.dumps(template.template)
        self.logger = logger

        # 获取他llm 相关算法配置
        self.llm_url = settings.LLM_BASE_URL
        self.llm_key = settings.LLM_API_KEY
        self.llm_model = settings.LLM_MODEL
        self.llm_client = AsyncOpenAI(api_key=self.llm_key, base_url=self.llm_url)
        
        
    async def _ask_llm(self, prompt: str) -> str:
        
        response = await self.llm_client.chat.completions.create(
            model=self.llm_model,
            messages=[
                {"role": "system", "content": "你是一个 PPt 页面设计助手"},
                {"role": "user", "content": prompt}
            ]
        )


        result_str = response.choices[0].message.content
        # 如果有 ```，去掉
        if '```' in result_str:
            result_str = '\n'.join(result_str.split('\n')[1:-1])

        try:
            result = json.loads(result_str)
        except:
            self.logger.error(f'LLM 返回结果无法解析为 JSON: {result_str}')
            return ''

        return result

    
    async def generate_slide_data(self, page_content):
        prompt = (
            self.prompt_temp
            .replace('{页面内容}', page_content)
            .replace('{可选样式}', self.template_str)
        )

        slide_data = await self._ask_llm(prompt)
        return slide_data
