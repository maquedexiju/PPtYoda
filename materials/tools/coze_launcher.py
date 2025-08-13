class Coze_Launcher:

    def __init__(self, task_id, prompt):
        self.task_id = task_id
        self.prompt = prompt

    async def launch(self, tab):


        await tab.go_to('https://space.coze.cn/?from=landingpage')
        input_div = await tab.query('//div[@class="cm-line"]', timeout=60)
        await input_div.click()
        await input_div.insert_text(self.prompt)