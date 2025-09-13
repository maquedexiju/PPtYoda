import os
from knowledge_base.tools import chroma_driver
import json
import random
from cairosvg import svg2png
import os
from lxml import etree
import re

class Icons_Handler:

    def __init__(self, icon_folder='icons'):
        self.icon_folder = icon_folder
        self.chroma_driver = chroma_driver.Chroma_Driver(collection_name='system_icons')
        self.mantain_info_json()

    def mantain_info_json(self):
        
        # 检查 info.json 是否存在
        info_json_path = os.path.join(self.icon_folder, 'info.json')
        if os.path.exists(info_json_path):
            with open(info_json_path, 'r') as f:
                info_json = json.load(f)
        else:
            info_json = {'icons': []}

        
        # 检查 icons 文件夹下的图标是否在 info.json 中
        new_icons = []
        for root, dirs, files in os.walk(self.icon_folder):
            for file in files:
                if file.endswith('.svg'):
                    # 获取图标从 icon_folder 起的相对路径
                    icon_path = os.path.relpath(os.path.join(root, file), self.icon_folder)
                    # 检查图标是否在 info.json 中
                    if icon_path not in info_json['icons']:
                        info_json['icons'].append(icon_path)
                        new_icons.append(icon_path)
        
        # 插入新图标到 Chroma 数据库
        if new_icons:
            with open(info_json_path, 'w') as f:
                json.dump(info_json, f, indent=4, ensure_ascii=False)
            self.chroma_driver.insert(documents=new_icons, metadatas=[{'path': i} for i in new_icons])


    def find_icon(self, query: str, threshold: float = 0.55):
        """
        查找图标

        Args:
            query: 查询文本
            n_results: 返回结果数量，默认为 5

        Returns:
            查找结果
        """
        result = self.chroma_driver.query(query_text=query, n_results=5)
        min_distance = result['distances'][0]
        if min_distance > threshold:
            return None
        else:
            max_distance = min(min_distance+0.05, threshold)

            icons_candidate = []
            for i in range(5):
                if result['distances'][i] < max_distance:
                    icons_candidate.append(result['metadatas'][i]['path'])


            # 从 icons_candidate 中随机选择一个图标
            icon_path = random.choice(icons_candidate)
            return icon_path


    def get_icon_content(self, icon_path: str):
        """
        获取图标的内容

        Args:
            icon_path: 图标路径

        Returns:
            图标内容
        """
        icon_path = os.path.join(self.icon_folder, icon_path)
        try:
            with open(icon_path, 'r') as f:
                icon_content = f.read()
            return icon_content
        except:
            default_icon_path = os.path.join(self.icon_folder, 'default.svg')
            with open(default_icon_path, 'r') as f:
                icon_content = f.read()
            return icon_content

    
    # svg 转 png
    def _get_svg_dimensions(self, svg_content):
        """从SVG文件中提取宽度和高度"""
            
        width_match = re.search(r'width\s*=\s*"([^"]+)"', svg_content)
        height_match = re.search(r'height\s*=\s*"([^"]+)"', svg_content)
        
        if not width_match or not height_match:
            viewBox_match = re.search(r'viewBox\s*=\s*"([^"]+)"', svg_content)
            if viewBox_match:
                viewBox = viewBox_match.group(1).split()
                if len(viewBox) == 4:
                    return float(viewBox[2]), float(viewBox[3])
            raise ValueError("无法从SVG中提取尺寸信息")
        
        width = float(re.sub(r'[^\d.]', '', width_match.group(1)))
        height = float(re.sub(r'[^\d.]', '', height_match.group(1)))
        
        return width, height

    def _add_chinese_fonts(self, svg_xml):
        """
        在所有font-family属性后添加中文字体
        在分号前增加: ,"PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei"
        """
        # 需要添加的中文字体
        chinese_fonts = ['"PingFang SC"', '"Microsoft YaHei"', '"WenQuanYi Micro Hei"']
        
        # 查找所有font-family属性
        for elem in svg_xml.xpath('//@font-family'):
            # 获取原来的字体
            fonts = elem.value.split(';')[0]
            for font in chinese_fonts:
                if font in fonts:
                    continue
            else:
                # 在分号前添加中文字体
                fonts = f"{elem.value}, {font}"

            elem.value = fonts

        return svg_xml

    def _change_svg_fill(self, svg_xml, fill_color):
        """
        改变SVG的fill颜色，目前支持 6 位 16 进制颜色
        """

        if fill_color == None: return svg_xml
        
        if len(fill_color) == 6:
            fill_color = '#' + fill_color

        for elem in svg_xml.xpath('//*[@fill]'):
            elem.set('fill', fill_color)

        # 给 svg 增加 fill
        ns = {'svg': 'http://www.w3.org/2000/svg'}
        svg_xml.xpath('//svg:svg', namespaces=ns)[0].set('fill', fill_color)

        return svg_xml

    def modify_svg(self, svg_content, svg_path, fill_color):

        # 读取并修改SVG内容，添加中文字体
        svg_xml = etree.fromstring(svg_content.encode('utf-8'))
        
        # 添加中文字体
        svg_xml = self._add_chinese_fonts(svg_xml)
        # 改变fill颜色
        svg_xml = self._change_svg_fill(svg_xml, fill_color)

        modified_svg = etree.tostring(svg_xml, encoding='utf-8')
        with open(svg_path, 'wb') as f:
            f.write(modified_svg)
        
        return modified_svg.decode('utf-8')




    def svg_to_png(self, svg_content, png_path, width=None, height=None, dpi=96):
        """
        转换SVG为PNG，自动添加中文字体支持
        """

        # 获取SVG原始尺寸
        orig_width, orig_height = self._get_svg_dimensions(svg_content)
        
        # 计算输出尺寸
        if width and not height:
            scale = width / orig_width
            height = orig_height * scale
        elif height and not width:
            scale = height / orig_height
            width = orig_width * scale
        elif not width and not height:
            width, height = orig_width, orig_height
        
        # 执行转换
        svg2png(
            bytestring=svg_content.encode('utf-8'),
            write_to=png_path,
            dpi=dpi,
            parent_width=orig_width,
            parent_height=orig_height,
            output_width=int(width),
            output_height=int(height)
        )
        
            

    
