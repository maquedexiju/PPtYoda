import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Project
from ppt_page.models import PPt_Page
from materials.models import Material_Task
import json

User = get_user_model()

@pytest.mark.django_db
def test_parse_basic_markdown_outline():
    # 创建测试用户和项目
    user = User.objects.create_user(username='testuser', password='12345')
    project = Project.objects.create(name='Test Project', user=user)

    # 测试基本列表解析
    markdown_text = """
- 标题1
- 标题2: 这是描述
* 标题3
- [ ] 待办项
- [x] 已完成项
    """.strip()

    # 执行解析方法
    outline = project.parse_markdown_outline(markdown_text)

    # 验证大纲结构
    assert len(outline) == 5
    assert outline[0]['name'] == '标题1'
    assert outline[0]['desc'] == ''
    assert outline[1]['name'] == '标题2'
    assert outline[1]['desc'] == '这是描述'
    assert all(len(item['id']) == 8 for item in outline)

    # 验证PPT页面创建
    assert PPt_Page.objects.filter(project=project).count() == 5
    assert PPt_Page.objects.get(name='标题2').description == '这是描述'

@pytest.mark.django_db
def test_parse_nested_markdown_outline():
    # 创建测试用户和项目
    user = User.objects.create_user(username='testuser2', password='12345')
    project = Project.objects.create(name='Test Nested Project', user=user)

    # 测试嵌套列表解析
    markdown_text = """
- 第一章
    - 1.1 引言
        - 1.1.1 研究背景
    - 1.2 方法
- 第二章: 实验结果
    """.strip()

    # 执行解析方法
    outline = project.parse_markdown_outline(markdown_text)

    # 验证嵌套结构
    assert len(outline) == 2
    assert outline[0]['name'] == '第一章'
    assert len(outline[0]['sub_tasks']) == 2
    assert outline[0]['sub_tasks'][0]['name'] == '1.1 引言'
    assert len(outline[0]['sub_tasks'][0]['sub_tasks']) == 1

    # 验证PPT页面创建（包含嵌套项）
    assert PPt_Page.objects.filter(project=project).count() == 5

@pytest.mark.django_db
def test_parse_markdown_materials_basic():
    # 创建测试用户和项目
    user = User.objects.create_user(username='testuser3', password='12345')
    project = Project.objects.create(name='Test Materials Project', user=user)

    # 测试基本材料解析
    markdown_text = """
- 任务1: 需求分析
- [ ] 任务2: 系统设计
- [x] 任务3: 数据库设计
* 任务4
    """.strip()

    # 执行解析方法
    project.parse_markdown_materials(markdown_text)
    project.refresh_from_db()

    # 验证materials字段结构
    materials = project.material_tasks
    assert len(materials) == 4
    assert materials[0]['name'] == '任务1'
    assert materials[0]['desc'] == '需求分析'
    assert materials[0]['status'] == 'todo'
    assert materials[1]['status'] == 'todo'
    assert materials[2]['status'] == 'done'
    assert materials[3]['desc'] == ''

    # 验证Material_Task记录创建
    assert Material_Task.objects.filter(project=project).count() == 4
    assert Material_Task.objects.get(name='任务2').status == 'todo'
    assert Material_Task.objects.get(name='任务3').status == 'done'

@pytest.mark.django_db
def test_parse_markdown_materials_nested():
    # 创建测试用户和项目
    user = User.objects.create_user(username='testuser4', password='12345')
    project = Project.objects.create(name='Test Nested Materials', user=user)

    # 测试嵌套材料解析
    markdown_text = """
- 阶段一: 准备工作
    - [ ] 任务1.1: 环境搭建
    - [ ] 任务1.2: 需求收集
        - 任务1.2.1: 用户访谈
        - 任务1.2.2: 竞品分析
- 阶段二: 开发
    - [x] 任务2.1: 框架搭建
    """.strip()

    # 执行解析方法
    project.parse_markdown_materials(markdown_text)

    # 验证materials字段嵌套结构
    materials = project.material_tasks
    assert len(materials) == 2
    assert len(materials[0]['sub_tasks']) == 2
    assert len(materials[0]['sub_tasks'][1]['sub_tasks']) == 2

    # 验证Material_Task记录层级关系
    phase1 = Material_Task.objects.get(name='阶段一')
    task1_1 = Material_Task.objects.get(name='任务1.1')
    task1_2_1 = Material_Task.objects.get(name='任务1.2.1')

    # 验证Material_Task的数量
    assert len(Material_Task.objects.all()) == 7

class ProjectSyncTests(TestCase):
    def setUp(self):
        # 创建测试用户和项目
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.project = Project.objects.create(
            name='Test Project',
            user=self.user,
            material_tasks=[]
        )

    def test_sync_creates_new_tasks(self):
        """测试同步创建新任务"""
        json_str = json.dumps([{
            'name': 'Task 1',
            'desc': 'Description 1',
            'status': 'todo',
            'sub_tasks': [{
                'name': 'Subtask 1-1',
                'status': 'doing'
            }]
        }])

        # 执行同步
        self.project.sync_material_tasks_from_json(json_str)

        # 验证JSON字段更新
        self.assertEqual(len(self.project.material_tasks), 1)
        # self.assertEqual(self.project.material_tasks[0]['id'], 't1')
        self.assertEqual(len(self.project.material_tasks[0]['sub_tasks']), 1)

        # 验证数据库记录创建
        self.assertEqual(Material_Task.objects.count(), 2)
        self.assertTrue(Material_Task.objects.filter(name='Task 1').exists())
        self.assertTrue(Material_Task.objects.filter(name='Subtask 1-1').exists())

    def test_sync_updates_existing_tasks(self):
        """测试同步更新现有任务"""
        # 初始数据
        self.project.material_tasks = [{
            'name': 'Old Name',
            'desc': 'Old Desc',
            'status': 'todo',
            'sub_tasks': []
        }]
        self.project.save()
        task = Material_Task.objects.create(
            project=self.project,
            name='Old Name',
            description='Old Desc',
            status='todo'
        )
        t_id = task.id
        

        # 同步更新数据
        json_str = json.dumps([{
            'id': t_id,
            'name': 'Updated Name',
            'desc': 'Updated Desc',
            'status': 'done',
            'sub_tasks': []
        }])
        self.project.sync_material_tasks_from_json(json_str)

        # 验证更新结果
        self.assertEqual(self.project.material_tasks[0]['name'], 'Updated Name')
        self.assertEqual(self.project.material_tasks[0]['status'], 'done')
        task = Material_Task.objects.get(project=self.project)
        self.assertEqual(task.name, 'Updated Name')
        self.assertEqual(task.status, 'done')

    def test_sync_deletes_missing_tasks(self):
        """测试同步删除不存在的任务"""
        # 初始数据
        self.project.save()
        t1 = task = Material_Task.objects.create(project=self.project, name='Task 1', status='todo')
        t1_id = t1.id
        t2 = Material_Task.objects.create(project=self.project, name='Task 2', status='todo')
        t2_id = t2.id
        self.project.material_tasks = [
            {'id': t1_id, 'name': 'Task 1', 'status': 'todo', 'sub_tasks': []},
            {'id': t2_id, 'name': 'Task 2', 'status': 'todo', 'sub_tasks': []}
        ]

        # 同步只包含t1的数据
        json_str = json.dumps([{
            'id': t1_id,
            'name': 'Task 1',
            'status': 'todo',
            'sub_tasks': []
        }])
        self.project.sync_material_tasks_from_json(json_str)

        # 验证t2被删除
        self.assertEqual(len(self.project.material_tasks), 1)
        self.assertEqual(Material_Task.objects.count(), 1)
        self.assertFalse(Material_Task.objects.filter(name='Task 2').exists())

    def test_invalid_json_raises_error(self):
        """测试无效JSON字符串抛出异常"""
        with self.assertRaises(ValueError):
            self.project.sync_material_tasks_from_json('invalid json')

    def test_sync_nested_subtasks(self):
        """测试同步嵌套子任务"""
        json_str = json.dumps([{
            'name': 'Parent Task',
            'sub_tasks': [{
                'name': 'Level 2 Task',
                'sub_tasks': [{
                    'name': 'Level 3 Task'
                }]
            }]
        }, {
            'name': 'Parent Task 2',
            'sub_tasks': [{
                'name': 'Level 2 Task 2',
                'sub_tasks': [{
                    'name': 'Level 3 Task 2'
                }]
            }]
        }
        ])

        self.project.sync_material_tasks_from_json(json_str)

        # 验证三级嵌套结构
        self.assertEqual(len(self.project.material_tasks), 2)
        self.assertEqual(len(self.project.material_tasks[0]['sub_tasks']), 1)
        self.assertEqual(len(self.project.material_tasks[0]['sub_tasks'][0]['sub_tasks']), 1)
        self.assertEqual(len(self.project.material_tasks[1]['sub_tasks']), 1)
        self.assertEqual(len(self.project.material_tasks[1]['sub_tasks'][0]['sub_tasks']), 1)
        self.assertEqual(Material_Task.objects.count(), 6)


class ProjectPPTSyncTests(TestCase):
    def setUp(self):
        # 创建测试用户和项目
        self.user = User.objects.create_user(username='ppt_testuser', password='12345')
        self.project = Project.objects.create(
            name='PPT Test Project',
            user=self.user,
            outline=[]
        )

    def test_sync_creates_new_ppt_pages(self):
        """测试同步创建新PPT页面"""
        json_str = json.dumps([{
            'name': 'Title Slide',
            'desc': 'Main presentation title',
            'sub_tasks': [{
                'name': 'Content Slide',
                'desc': 'Detailed content'
            }]
        }])

        # 执行同步
        self.project.sync_ppt_pages_from_json(json_str)

        # 验证outline字段更新
        self.assertEqual(len(self.project.outline), 1)
        self.assertEqual(self.project.outline[0]['name'], 'Title Slide')
        self.assertTrue('id' in self.project.outline[0])
        self.assertEqual(len(self.project.outline[0]['sub_tasks']), 1)

        # 验证数据库记录创建
        self.assertEqual(PPt_Page.objects.filter(project=self.project).count(), 2)
        self.assertTrue(PPt_Page.objects.filter(name='Title Slide').exists())

    def test_sync_updates_existing_ppt_pages(self):
        """测试同步更新现有PPT页面"""
        # 创建初始页面
        initial_page = PPt_Page.objects.create(
            project=self.project,
            name='Old Title',
            description='Old Description'
        )
        self.project.outline = [{
            'id': initial_page.id,
            'name': 'Old Title',
            'desc': 'Old Description',
            'sub_tasks': []
        }]
        self.project.save()

        # 同步更新数据
        json_str = json.dumps([{
            'id': initial_page.id,
            'name': 'Updated Title',
            'desc': 'Updated Description',
            'sub_tasks': []
        }])
        self.project.sync_ppt_pages_from_json(json_str)

        # 验证更新结果
        self.assertEqual(self.project.outline[0]['name'], 'Updated Title')
        page = PPt_Page.objects.get(id=initial_page.id)
        self.assertEqual(page.name, 'Updated Title')
        self.assertEqual(page.description, 'Updated Description')

    def test_sync_deletes_missing_ppt_pages(self):
        """测试同步删除不存在的PPT页面"""
        # 创建两个初始页面
        page1 = PPt_Page.objects.create(project=self.project, name='Page 1')
        page2 = PPt_Page.objects.create(project=self.project, name='Page 2')
        self.project.outline = [
            {'id': page1.id, 'name': 'Page 1', 'sub_tasks': []},
            {'id': page2.id, 'name': 'Page 2', 'sub_tasks': []}
        ]
        self.project.save()

        # 同步只包含page1的数据
        json_str = json.dumps([{
            'id': page1.id,
            'name': 'Page 1',
            'sub_tasks': []
        }])
        self.project.sync_ppt_pages_from_json(json_str)

        # 验证page2被删除
        self.assertEqual(len(self.project.outline), 1)
        self.assertEqual(PPt_Page.objects.filter(project=self.project).count(), 1)
        self.assertFalse(PPt_Page.objects.filter(id=page2.id).exists())

    def test_invalid_json_raises_error(self):
        """测试无效JSON字符串抛出异常"""
        with self.assertRaises(ValueError):
            self.project.sync_ppt_pages_from_json('invalid json')

    def test_sync_nested_ppt_pages(self):
        """测试同步嵌套PPT页面结构"""
        json_str = json.dumps([{
            'name': 'Chapter 1',
            'sub_tasks': [{
                'name': 'Section 1.1',
                'sub_tasks': [{
                    'name': 'Subsection 1.1.1'
                }]
            }]
        }])

        self.project.sync_ppt_pages_from_json(json_str)

        # 验证三级嵌套结构
        self.assertEqual(len(self.project.outline), 1)
        self.assertEqual(len(self.project.outline[0]['sub_tasks']), 1)
        self.assertEqual(len(self.project.outline[0]['sub_tasks'][0]['sub_tasks']), 1)
        self.assertEqual(PPt_Page.objects.count(), 3)
