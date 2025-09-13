from pptx import Presentation
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.oxml import parse_xml
from pptx.parts.slide import SlidePart
from pptx.oxml.ns import _nsmap

_nsmap['p14'] = 'http://schemas.microsoft.com/office/powerpoint/2010/main'
_nsmap['a'] = 'http://schemas.openxmlformats.org/drawingml/2006/main'

bright_list = [0.8, 0.6, 0.5, 0.4, 0.35, 0.25, 0.15, 0.05, 0.0, -0.05, -0.15, -0.25, -0.35, -0.5]

def rgb_to_hsl(r, g, b):
    """
    将 RGB 颜色值转换为 HSL 颜色值
    
    参数:
        r: 红色分量 (0-255)
        g: 绿色分量 (0-255)
        b: 蓝色分量 (0-255)
    
    返回:
        一个元组 (h, s, l)，其中:
            h: 色相 (0.0-360.0)
            s: 饱和度 (0.0-1.0)
            l: 明度 (0.0-1.0)
    """
    # 将 RGB 值归一化到 0.0-1.0 范围
    r_normalized = r / 255.0
    g_normalized = g / 255.0
    b_normalized = b / 255.0
    
    # 找出 RGB 中的最大值和最小值
    max_val = max(r_normalized, g_normalized, b_normalized)
    min_val = min(r_normalized, g_normalized, b_normalized)
    
    # 计算明度 (lightness)
    l = (max_val + min_val) / 2.0
    
    # 如果是灰色（max 和 min 相等），饱和度为 0
    if max_val == min_val:
        h = 0.0  # 色相无意义，设为 0
        s = 0.0
    else:
        # 计算饱和度 (saturation)
        delta = max_val - min_val
        if l < 0.5:
            s = delta / (max_val + min_val)
        else:
            s = delta / (2.0 - max_val - min_val)
        
        # 计算色相 (hue)
        if max_val == r_normalized:
            h = (g_normalized - b_normalized) / delta
            if g_normalized < b_normalized:
                h += 6
        elif max_val == g_normalized:
            h = (b_normalized - r_normalized) / delta + 2
        else:  # max_val == b_normalized
            h = (r_normalized - g_normalized) / delta + 4
        
        # 将色相转换为 0-360 度
        h *= 60.0
    
    return (round(h, 2), round(s, 4), round(l, 4))

# HSL转RGB的核心算法（基于HSL色彩模型的数学转换）
def _hue_to_rgb(p, q, t):
    """辅助函数：根据色相计算单个RGB分量"""
    t = t % 1.0  # 确保t在0-1范围内
    if t < 1/6:
        return p + (q - p) * 6 * t
    if t < 1/2:
        return q
    if t < 2/3:
        return p + (q - p) * (2/3 - t) * 6
    return p

def hsl_to_rgb(h, s, l):
    """
    将HSL颜色值转换为RGB数值
    
    参数:
        h: 色相 (0.0-360.0的浮点数，超出范围会取模处理)
        s: 饱和度 (0.0-1.0的浮点数，0.0=灰色，1.0=全饱和)
        l: 明度 (0.0-1.0的浮点数，0.0=黑色，1.0=白色)
    
    返回:
        tuple: RGB数值元组 (r, g, b)，每个分量为0-255的整数
    """
    # 处理色相超出360°的情况（取模，如370°→10°）
    h = h % 360.0
    # 确保饱和度和明度在0.0-1.0范围（超出则截断）
    s = max(0.0, min(1.0, s))
    l = max(0.0, min(1.0, l))
    
    if s == 0.0:
        # 饱和度为0时，是灰色（RGB分量相等，由明度决定）
        gray = int(round(l * 255.0))
        return (gray, gray, gray)
    
    # 计算中间变量q和p（根据明度l决定）
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    
    # 将色相转换为0-1范围（hue_normalized = h/360）
    hue_normalized = h / 360.0
    
    # 计算RGB三个分量的归一化值（0.0-1.0）
    r_normalized = _hue_to_rgb(p, q, hue_normalized + 1/3)
    g_normalized = _hue_to_rgb(p, q, hue_normalized)
    b_normalized = _hue_to_rgb(p, q, hue_normalized - 1/3)
    
    # 将归一化值转换为0-255的整数（四舍五入）
    r = int(round(r_normalized * 255.0))
    g = int(round(g_normalized * 255.0))
    b = int(round(b_normalized * 255.0))
    
    return (r, g, b)

class Color_Parser:

    def __init__(self, prs: Presentation):
        self.prs = prs
        self.color_scheme = self._get_theme_colors()

    
    def _get_theme_colors(self):
        color_scheme = {}
        for slide_master in self.prs.slide_masters:
            theme_part = slide_master.part.part_related_by(RT.THEME)
            theme_name = str(theme_part.partname)
            color_scheme[theme_name] = {}
            theme = parse_xml(theme_part.blob)
            color_elements = theme.xpath('a:themeElements/a:clrScheme/*')
            for c in color_elements:
                tag = c.tag.replace('{http://schemas.openxmlformats.org/drawingml/2006/main}', '')
                color_scheme[theme_name][tag] = {}

                # tree = etree.fromstring(c._element.xml)
                color = c.xpath('./a:srgbClr/@val', namespaces=_nsmap)
                if color:
                    cv = color[0]
                else:
                    # print(c.xpath('./a:sysClr/@val', namespaces=_nsmap))
                    # print(c.xpath('./a:sysClr/@lastClr', namespaces=_nsmap))
                    cv = c.xpath('./a:sysClr/@lastClr', namespaces=_nsmap)[0]
                

                r, g, b = int(cv[0:2], 16), int(cv[2:4], 16), int(cv[4:6], 16)
                h, s, l = rgb_to_hsl(r, g, b)

                for bright in bright_list:
                    # bright < 0
                    # ‘V’ of color(25% darker) = [‘V’ of specified color]*(1-25%)

                    # bright > 0
                    # ‘S’ of color(60% lighter) = [‘S’ of specified color]*(1-60%)
                    # ‘V’ of color(60% lighter) = [V’ of specified color]*(1-60%)+100*60%

                    # https://community.fabric.microsoft.com/t5/Desktop/Calculate-shades-of-theme-colors/m-p/880024
                    if bright < 0:
                        r, g, b = hsl_to_rgb(h, s, l * (1 + bright))
                    else:
                        r, g, b = hsl_to_rgb(h, s * (1 - bright), l * (1 - bright) + 1 * bright)

                    cv = f'{r:02x}{g:02x}{b:02x}'.upper()
                    color_scheme[theme_name][tag][bright] = {
                        'rgb_hex': cv,
                        'rgb_int': (r, g, b),
                        'hsl': (h, s, l * (1 + bright)),
                    }
        
        return color_scheme

    
    def _get_mapped_color_name(self, slide, color_name):
        
        slide_layout = slide.slide_layout
        # 有重写
        '''
        <p:clrMapOvr>
            <a:overrideClrMapping bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2"
                accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink" />
        </p:clrMapOvr>
        '''
        # 无重写样式
        '''
        <p:clrMapOvr>
            <a:masterClrMapping />
        </p:clrMapOvr>
        '''
        if layout_clrMap := slide_layout._element.xpath('//a:overrideClrMapping'):
            layout_clrMap = layout_clrMap[0]
            return layout_clrMap.xpath(f'./@{color_name}')[0]

        # 以母版的映射为准
        '''
        <p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3"
        accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink" />
        '''
        slide_master = slide_layout.slide_master
        master_clrMap = slide_master._element.xpath('//p:clrMap')[0]
        return master_clrMap.xpath(f'./@{color_name}')[0]

            
    def get_fore_color_rgb_hex(self, shape):

        # try:
        #     fore_color = shape.fill.fore_color
        # except:
        #     return None

        fill_type = shape.fill.type
        if fill_type == None:
            # 尝试通过 fillRef 获取主题颜色
            theme_color = shape._element.xpath('//a:fillRef/a:schemeClr/@val')
            part=shape.part
            theme_name = str(part.slide_layout.slide_master.part.part_related_by(RT.THEME).partname)
            if theme_color:
                color_name = theme_color[0]
                bright = 0
                return self.color_scheme[theme_name][color_name][bright]['rgb_hex']
            else:
                return None
        
        else:
            fore_color = shape.fill.fore_color

            if hasattr(fore_color, 'rgb'):
                rgb_hex = fore_color.rgb
                bright = fore_color.brightness
                if bright != 0:
                    r, g, b = int(rgb_hex[0:2], 16), int(rgb_hex[2:4], 16), int(rgb_hex[4:6], 16)
                    h, s, l = rgb_to_hsl(r, g, b)
                    r, g, b = hsl_to_rgb(h, s, l + bright)
                    rgb_hex = f'{r:02x}{g:02x}{b:02x}'.upper()
                else:
                    rgb_hex = str(rgb_hex)
                return rgb_hex
            elif hasattr(fore_color, 'theme_color'):

                color_name = fore_color.theme_color.xml_value
                bright = fore_color.brightness
                
                # 获取 SlidePart
                while part := shape.part:
                    if isinstance(part, SlidePart):
                        break
                theme_name = str(part.slide_layout.slide_master.part.part_related_by(RT.THEME).partname)
                color_scheme = self.color_scheme[theme_name]
                mapped_color_name = self._get_mapped_color_name(part, color_name)
                # 如果 mapped_color_name 包含 bg 或 lt
                if 'bg' in mapped_color_name or 'lt' in mapped_color_name:
                    bright = -bright

                if mapped_color_name not in color_scheme.keys():
                    return None
                if bright not in color_scheme[mapped_color_name]:
                    return None
                return color_scheme[mapped_color_name][bright]['rgb_hex']

            
            else:
                return None