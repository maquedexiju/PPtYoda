import os, sys
project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_dir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ppt_killer.settings")

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.core.files.base import ContentFile

import subprocess
import shutil
from datetime import datetime

# 定义颜色常量，用于输出格式化
class Color:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'


def print_with_color(text, color=Color.GREEN):
    """带颜色打印文本"""
    print(f"{color}{text}{Color.END}")


def delete_old_files():
    """删除旧文件"""
    # 删除旧文件
    if os.path.exists("db.sqlite3"):
        print_with_color("正在删除旧文件")
        os.remove("db.sqlite3")
    
    if os.path.exists("config.ini"):
        os.remove("config.ini")
    

def init_database():
    """执行数据库初始化"""
    print_with_color("正在执行数据库初始化")

    # 检查数据库文件是否存在
    if os.path.exists("db.sqlite3"):
        print_with_color("数据库文件已存在")
        return
    
    # 执行数据库迁移
    print_with_color("执行数据库迁移...")
    try:
        subprocess.run(["uv", "run", "manage.py", "makemigrations"], check=True)
        subprocess.run(["uv", "run", "manage.py", "migrate"], check=True)
        print_with_color("数据库迁移成功")
    except subprocess.CalledProcessError as e:
        print_with_color(f"数据库迁移失败: {e}", Color.RED)
        sys.exit(1)
    
    # 创建超级用户
    user = create_superuser(
        username='ppt_killer',
        email='pt@admin.com',
        password='pt_12345'
    )
    # 创建默认模板
    create_defalut_templates(user)


def configure_files():
    """配置文件"""
    print_with_color("正在配置文件")

    # 检查配置文件是否存在
    if os.path.exists("config.ini"):
        print_with_color("配置文件已存在")
        return
    
    # 复制配置文件
    if os.path.exists("config.ini.example"):
        try:
            shutil.copy2("config.ini.example", "config.ini")
            print_with_color("配置文件已复制成功")
        except Exception as e:
            print_with_color(f"配置文件复制失败: {e}", Color.RED)
            sys.exit(1)
    else:
        print_with_color("配置文件模板不存在", Color.RED)
        sys.exit(1)


def create_superuser(username, email, password):
    try:
        # 尝试创建超级用户
        superuser = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print_with_color(f"超级用户 '{username}' 创建成功")
        return superuser
    except Exception as e:
        print_with_color(f"创建超级用户时出错: {str(e)}", Color.RED)
        return None


def create_defalut_templates(user):
    """创建默认模板"""
    print_with_color("正在创建默认模板")
    # 检查 ppt_files 是否存在
    if not os.path.exists("ppt_files"):
        os.makedirs("ppt_files")
    
    # 遍历 ppt_templates_files 目录
    for template in os.listdir("ppt_templates_files"):
        # 文件结尾 pptx
        if template.endswith(".pptx"):
            print_with_color(f"正在创建模板 {template}")
            # 创建模板记录
            ppt_template = PPt_Template(
                name=template[:-5],
                user=user,
                file=ContentFile(
                    open(os.path.join("ppt_templates_files", template), "rb").read(),
                    name=template
                )
            )
            ppt_template.save()
    


if __name__ == "__main__":

    """主函数"""
    print_with_color("==== PPT Killer 安装脚本 ====")

    # 删除旧模板
    # delete_old_files()
    
    # 数据制作过程
    configure_files()

    import django
    django.setup()

    User = get_user_model()
    from ppt_template.models import PPt_Template

    init_database()

    print_with_color("安装完成！")