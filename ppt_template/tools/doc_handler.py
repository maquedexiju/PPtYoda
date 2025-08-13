import os
import uuid

# 处理 md 文档，生成 PPt 的结构 json
class Doc_Handler():

    def __init__(self, md):

        # 如果 md 是文件，从文件读取
        if os.path.exists(md):
            with open(md, 'r', encoding='utf-8') as f:
                self.md = f.read().strip()
        else:
            self.md = md.strip()

        self.md_lines = self.md.split('\n')
        self.sections = {}
        self.slides = {}

        self.get_head()

    def get_head(self):
        # 检查 md 文档的头部
        if self.md.startswith('---'):
            head_lines = self.md_lines[:1]
            self.md_lines.remove('---')
            # 读取头部信息
            for ln in range(len(self.md_lines)):
                line = self.md_lines[ln]
                head_lines.append(line)
                if line.startswith('---'):
                    break
            self.md_lines = self.md_lines[ln+1:]
            
            self.head = '\n'.join(head_lines)
        else:
            self.head = ''

    def _split_section(self):
        # 分割文档为 section

        self.sections = {}

        section_name = f'unnamed_{str(uuid.uuid4())[:4]}'

        section_content = []
        for line in self.md_lines:
            if line.startswith('@section'):

                if section_content != [] or not section_name.startswith('unnamed'):
                    self.sections[section_name] = '\n'.join(section_content).strip()
                section_content = []
                if '@section-' not in line:
                    section_name = f'unnamed_{str(uuid.uuid4())[:4]}'
                else:
                    section_name = line.split('@section-')[1].strip()
                    if section_name == '':
                        section_name = f'unnamed_{str(uuid.uuid4())[:4]}'                    
            else:
                section_content.append(line)

        if section_content != [] or not section_name.startswith('unnamed'):
            self.sections[section_name] = '\n'.join(section_content).strip()

    def _split_slide_from_section(self, section_name):
        # 分割 section 为 slide
        section = self.sections[section_name]

        lines = section.split('\n')
        slide_content = []
        slide_name = None
        slide_list = []
        slide = {}
        for ln in range(len(lines)):
            line = lines[ln]            
            if line.startswith('@slide'):
                
                # 处理现有的 slide
                if slide_name is not None:
                    slide.update({
                        'slide_name': slide_name,
                        'content': '\n'.join(slide_content).strip()
                    })
                    slide_list.append(slide)

                # 新建 slide 
                if line.startswith('@slide-'):
                    slide_name = line.split('@slide-')[1].strip()
                else:
                    slide_name = ''
                slide_content = []
            if line.startswith('@master'):
                master_name = line.split('@master-')[1].strip()
                slide.update({
                    'master': master_name
                })

            else:
                slide_content.append(line)
            
        if slide_name is not None:
            slide.update({
                'slide_name': slide_name,
                'content': '\n'.join(slide_content).strip()
            })
            slide_list.append(slide)
        
        return slide_list

    def get_slides(self):

        self.slides = {}
        self._split_section()
        for section_name in self.sections.keys():
            self.slides[section_name] = self._split_slide_from_section(section_name)

        return self.slides