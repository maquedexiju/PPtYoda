import React, { useState, useRef } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { TaskForm } from './TaskForm';
import { Task, TaskItem } from './TaskItem';
import { findTaskById, findParentTaskById, findTaskBreadcrumb } from '@/lib/json_tools';

interface TaskApiResponse {
  tasks_content: Task[];
}

interface TaskApiParams {
  tasks_content: Task[];
}

interface MaterialTaskListProps {
  chosenTaskId: number | null;
  tasks: Task[];
  project_id: string | number;
  onChooseTask: (task: Task | null, breadcrumb: Task[] | undefined) => void;
}


export const MaterialTaskList: React.FC<MaterialTaskListProps> = ({ chosenTaskId: initialChosenTaskId, tasks: initialTasks, project_id, onChooseTask }) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // newStatus 可以是之一：'todo' | 'doing' | 'done'
  const onStatusChange = async (taskId: number, newStatus: 'todo' | 'doing' | 'done') => {
    // 找到 tasks 中 taskId 对应的任务
    // 也在 sub_tasks 中查找
    // 对任务和子任务的状态进行变更
    console.log('开始变更', taskId, newStatus);
    const updateSubTasksStatus = (subTasks: Task[], status: 'todo' | 'doing' | 'done') => {
      subTasks.forEach(task => {
        task.status = status;
        updateSubTasksStatus(task.sub_tasks, status);
      });
    };

    const updateStatus = (tasks: Task[], id: number, status: 'todo' | 'doing' | 'done') => {
      tasks.forEach(task => {
        if (task.id === id) {
          task.status = status;
          updateSubTasksStatus(task.sub_tasks, status);
          return;
        }
        updateStatus(task.sub_tasks, id, status);
      });
    };

    updateStatus(tasks, taskId, newStatus);
    // 上传状态
    uploadTasks();
    setTasks([...tasks]);
    
  };

  // 请求后端，对 tasks 进行更新
  const uploadTasks = async () => {
    const csrfToken = getCookie('csrftoken');
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/projects/${project_id}/material_tasks/update/`, {
        tasks_content: tasks
      }, {
        headers: {
          'X-CSRFToken': csrfToken
        },
        withCredentials: true
      });
      console.log('hello');
      if (response.data) {
        const apiResponse = response.data as TaskApiResponse;
        if (apiResponse.tasks_content) {
          console.log(apiResponse.tasks_content);
          setTasks(apiResponse.tasks_content);
        }
      }
    } catch (err) {
      console.error('Error updating tasks:', err);
    }
    
  };

  // 编辑状态切换处理
  const handleEditClick = () => {
    if (isEditing) {
      // 上传 tasks
      uploadTasks();
    } else {
      // choosed 清空
      setChosenTaskId(null);
      onChooseTask(null, undefined);
    }
    setIsEditing(!isEditing);
  };

  // 删除任务处理（按需求暂不实现具体逻辑）
  const handleDeleteTask = (taskId: number) => {
    // TODO: 实现删除逻辑
    console.log('Delete task:', taskId);
    const parentTask = findParentTaskById(tasks, taskId);
    if (typeof parentTask === 'object' && parentTask.sub_tasks) {
      parentTask.sub_tasks = parentTask.sub_tasks.filter((task: Task) => task.id !== taskId);
      setTasks([...tasks]);
    } else {
      // 可能是根任务
      setTasks(tasks.filter(task => task.id !== taskId));
    }

  };

  // 排序任务处理（按需求暂不实现具体逻辑）
  const handleSortTask = (direction: 'up' | 'down', taskId: number) => {
    // TODO: 实现排序逻辑
    console.log('Sort task:', direction, taskId);
    const parentTask = findParentTaskById(tasks, taskId);
    // 遍历子任务，如果是 up，就往前挪一个，如果是 down，往后挪一个
    if (typeof parentTask === 'object') {
      const subTasks = parentTask.sub_tasks;
      const index = subTasks.findIndex((task: Task) => task.id === taskId);
      if (index !== -1) {
        if (direction === 'up' && index > 0) {
          [subTasks[index - 1], subTasks[index]] = [subTasks[index], subTasks[index - 1]];
        } else if (direction === 'down' && index < subTasks.length - 1) {
          [subTasks[index], subTasks[index + 1]] = [subTasks[index + 1], subTasks[index]];
        }
      }
    } else {
      // 可能是根任务
      const index = tasks.findIndex(task => task.id === taskId);
      if (index !== -1) {
        if (direction === 'up' && index > 0) {
          [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]];
        } else if (direction === 'down' && index < tasks.length - 1) {
          [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
        }
      }
    }
    setTasks([...tasks]);
  };

  // 编辑任务处理
  const handleEditTask = (taskId: number, updates: Partial<Task>) => {
    // TODO: 实现编辑逻辑
    console.log('Edit task:', taskId, updates);
    const task = findTaskById(tasks, taskId);
    if (task) {
      Object.assign(task, updates);
      setTasks([...tasks]);
    }
  };

  // 添加子任务处理
  const handleAddSubTask = async (parentTaskId: number | undefined, subTask: Partial<Task>) => {
    // 为 subTask 添加一个 t-时间戳 作为临时 id
    subTask.id = 't-' + Date.now();

    console.log('Add sub task:', parentTaskId, subTask);
    if (typeof parentTaskId === 'undefined') {
      tasks.push(subTask as Task);
      await uploadTasks();
      // setTasks([...tasks]);
      return;
    }
    const parentTask = findTaskById(tasks, parentTaskId);
    if (parentTask) {
      if (!parentTask.sub_tasks) {
        parentTask.sub_tasks = [];
      }
      parentTask.sub_tasks.push(subTask as Task);
      await uploadTasks();
      setTasks([...tasks]);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // 处理“添加任务”按钮点击
  const handleAddTaskClick = () => {
    setIsAddingTask(true);
    // 等待 0.2 秒
    setTimeout(() => {
      // scrollToBottom();
      // 聚焦到输入框
      (document.querySelector('input[name="newTaskName"]') as HTMLInputElement)?.focus();
    }, 200);
  };

  // 处理添加任务
  const handleAddTask = async (name: string, desc: string) => {
    await handleAddSubTask(undefined, {
      name,
      desc,
      status: 'todo',
      sub_tasks: []
    });
    setIsAddingTask(false);
    setNewTaskName('');
    setNewTaskDesc('');
  }

  // === 处理选中任务 ===
  const [chosenTaskId, setChosenTaskId] = useState<number | null>(initialChosenTaskId);
  const handleChooseTask = (task: Task) => {
    console.log('选择任务', task.id);
    setChosenTaskId(task.id);
    const breadcrumb = findTaskBreadcrumb(tasks, task.id);
    onChooseTask(task, breadcrumb);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center space-x-2">
          <h2 className="text-lg font-bold mb-3">素材收集任务</h2>
          {/* isEditing 状态下不显示 添加任务 按钮 */}
          {!isEditing && (
            <button className="bg-blue-500 text-white px-2 py-1 rounded text-sm mb-3" onClick={handleAddTaskClick}>添加任务</button>
          )}
          {/* 新增编辑按钮 */}
          <button 
            className={`px-2 py-1 rounded text-sm mb-3 ${isEditing ? 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-800'}`} 
            onClick={handleEditClick}
          >
            {isEditing ? '退出编辑' : '编辑'}
          </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto" style={{scrollbarWidth:"none"}} ref={scrollRef}>
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            level={0}
            isEditing={isEditing} 
            onStatusChange={onStatusChange}
            onDelete={handleDeleteTask}
            onSort={handleSortTask}
            onAddSubTask={handleAddSubTask}
            onUpdateTask={handleEditTask}
            choosed={chosenTaskId}
            onChooseTask={handleChooseTask}
          />
        ))} 
        {/* 使用新组件替换原有代码 */}
        {isAddingTask && (
          <TaskForm
            newTaskName={newTaskName} 
            newTaskDesc={newTaskDesc}
            onSave={handleAddTask}
            onCancel={() => setIsAddingTask(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MaterialTaskList;