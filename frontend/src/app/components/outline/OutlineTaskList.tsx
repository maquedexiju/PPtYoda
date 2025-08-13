import React, { useState, useRef, useEffect, Fragment } from 'react';
import axios from 'axios';

import { getCookie } from '@/lib/cookies';
import { OutlineTaskForm } from './TaskForm';
import { OutlineTask, OutlineTaskItem } from './TaskItem';
import { GenerateOutlineButton } from './GenerateOutline';
import { OutlineBatchOperations } from './OutlineBatchOperations';

import { findTaskById, findParentTaskById, findTaskBreadcrumb, replaceTask } from '@/lib/json_tools';

interface TaskApiResponse {
  tasks_content: OutlineTask[];
}

interface TaskApiParams {
  tasks_content: OutlineTask[];
}

interface OutlineTaskListProps {
  chosenTaskId: number | null;
  tasks: OutlineTask[];
  project_id: string | number;
  onChooseTask: (task: OutlineTask | null, breadcrumb: OutlineTask[] | undefined) => void;
  editedOutline: OutlineTask | null;
}

interface OutlineGenerateResponse {
  status: string;
  message: string;
  desc?: string;
  text?: string;
  tasks_content?: OutlineTask[];
}


export const OutlineTaskList: React.FC<OutlineTaskListProps> = ({ chosenTaskId: initialChosenTaskId, tasks: initialTasks, project_id, onChooseTask, editedOutline }) => {
  const [tasks, setTasks] = useState<OutlineTask[]>(initialTasks);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState('content');
  const [isEditing, setIsEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 根据 OutlineTask 情况，判断是否为空
  const [isEmpty, setIsEmpty] = useState(true);
  useEffect(() => {
    if (tasks.length === 0 || tasks === null) {
      setIsEmpty(true);
    } else {
      setIsEmpty(false);
    }
  }, [tasks]);
  
  // 处理 panel 位置编辑 outline 带来的影响
  useEffect(() => {
    if (editedOutline) {
      replaceTask(tasks, editedOutline);
      uploadTasks();
      // setTasks(tasks);
    }
  }, [editedOutline]);

  // 请求后端，对 tasks 进行更新
  const uploadTasks = async () => {
    const csrfToken = getCookie('csrftoken');
    console.log('uploadtask');
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/projects/${project_id}/outline/update/`, {
        tasks_content: tasks
      }, {
        headers: {
          'X-CSRFToken': csrfToken
        },
        withCredentials: true
      });
      if (response.data) {
        const apiResponse = response.data as TaskApiResponse;
        if (apiResponse.tasks_content) {
          setTasks(apiResponse.tasks_content);
          const chosenTask = findTaskById(apiResponse.tasks_content, initialChosenTaskId);
          if (chosenTask) {
            onChooseTask(chosenTask, findTaskBreadcrumb(apiResponse.tasks_content, chosenTask.id));
          }
        }
      }
    } catch (err) {
      console.error('Error updating tasks:', err);
    }
    
  };


  // on_outline_generated 回调
  const on_outline_generated = (outline: OutlineTask[]) => {
    setTasks(outline);
  }

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
    if (typeof parentTask === 'object') {
      parentTask.sub_tasks = (parentTask.sub_tasks || []).filter((task: OutlineTask) => task.id !== taskId);
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
      const index = subTasks.findIndex((task: OutlineTask) => task.id === taskId);
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
  const handleEditTask = (taskId: number, updates: Partial<OutlineTask>) => {
    // TODO: 实现编辑逻辑
    console.log('Edit task:', taskId, updates);
    const task = findTaskById(tasks, taskId);
    if (task) {
      Object.assign(task, updates);
      setTasks([...tasks]);
    }
  };

  // 添加子任务处理
  const [addBeforePosition, setAddBeforePosition] = useState<number | string | null>(null);
  const handleAddSubTask = async (parentTaskId: number | undefined, subTask: Partial<OutlineTask>, position: number | string | null) => {

    // 生成 id
    subTask.id = 't-' + Date.now();

    // 第一层任务
    if (typeof parentTaskId === 'undefined') {
      // tasks.push(subTask as OutlineTask);
      // position 是 add 在谁的前边，如果是 null，就是最后一个
      if (position == null) {
        tasks.push(subTask as OutlineTask);
      } else {
        // 找到 position 对应的任务
        const idx = tasks.findIndex(task => task.id === position);
        // 如果找到 idx，就插入到 idx 前边
        if (idx !== -1) {
          tasks.splice(idx, 0, subTask as OutlineTask);
        }
      }
      await uploadTasks();
      setTasks([...tasks]);
      return;
    }
    // 子任务
    const parentTask = findTaskById(tasks, parentTaskId);
    if (parentTask && parentTask.sub_tasks) {
      if (position == null) {
        parentTask.sub_tasks.push(subTask as OutlineTask);
      } else {
        const idx = parentTask.sub_tasks.findIndex(task => task.id === position);
        if (idx !== -1) {
          parentTask.sub_tasks.splice(idx, 0, subTask as OutlineTask);
        }
      }
      await uploadTasks();
      setTasks([...tasks]);
    }
  };

  // // 处理“添加任务”按钮点击
  // const handleAddTaskClick = () => {
  //   setIsAddingTask(true);
  //   // 等待 0.2 秒
  //   setTimeout(() => {
  //     // scrollToBottom();
  //     // 聚焦到输入框
  //     (document.querySelector('input[name="newTaskName"]') as HTMLInputElement)?.focus();
  //   }, 200);
  // };

  // 处理添加任务
  const handleAddTask = async (name: string, desc: string) => {
    await handleAddSubTask(undefined, {
      name,
      desc,
      p_type: newTaskType,
      sub_tasks: []
    }, addBeforePosition);
    setIsAddingTask(false);
    setNewTaskName('');
    setNewTaskDesc('');
  }
  // 处理子任务上传的 addBefore 回调
  const handleAddBefore = (position: number | string, pType: string) => {
    setAddBeforePosition(position); // 确定添加位置，同时让对应位置的 input 显示
    setIsAddingTask(true);
    setNewTaskType(pType);
    setTimeout(() => {
      // 聚焦到输入框
      (document.querySelector('input[name="newTaskName"]') as HTMLInputElement)?.focus();
    }, 200);
  };
  // 处理子任务上传的 addAfter 回调
  const handleAddAfter = (position: number | string, pType: string) => {
    // 找到后一个 id 是 position 的 sub_task 或者为 null
    const index = tasks.findIndex(task => task.id === position);
    if (index == tasks.length - 1) {
      setAddBeforePosition(null);
    } else {
      setAddBeforePosition(tasks[index + 1].id);
    }
    setIsAddingTask(true);
    setNewTaskType(pType);
    setTimeout(() => {
      // 聚焦到输入框
      (document.querySelector('input[name="newTaskName"]') as HTMLInputElement)?.focus();
    }, 200);
  };

  // === 处理选中任务 ===
  const [chosenTaskId, setChosenTaskId] = useState<number | null>(initialChosenTaskId);
  const handleChooseTask = (task: OutlineTask) => {
    setChosenTaskId(task.id);
    const breadcrumb = findTaskBreadcrumb(tasks, task.id);
    onChooseTask(task, breadcrumb);
  };

  // 如果空，那么返回空大纲和“创建大纲”按钮
  if (isEmpty) {
    return (
        <div className="bg-white h-full rounded">
          <GenerateOutlineButton project_id={project_id} on_outline_generated={on_outline_generated}/>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center space-x-2">
          <h2 className="text-lg font-bold mb-3">大纲列表</h2>
          {/* isEditing 状态下不显示 添加任务 按钮 */}
          {/* {!isEditing && (
            <button className="bg-blue-500 text-white px-2 py-1 rounded text-sm mb-3" onClick={handleAddTaskClick}>添加大纲</button>
          )} */}
          {/* 新增编辑按钮 */}
          <button 
            className={`px-2 py-1 rounded text-sm mb-3 ${isEditing ? 'bg-gray-200 text-gray-800' : 'bg-gray-200 text-gray-800'}`} 
            onClick={handleEditClick}
          >
            {isEditing ? '退出编辑' : '编辑'}
          </button>
      </div>
      <div className="space-y-2 overflow-y-scroll grow" style={{scrollbarWidth:"none"}} ref={scrollRef}>
        {tasks.map(task => (
          <Fragment key={task.id}>
            {(addBeforePosition == task.id && isAddingTask) && (
              <OutlineTaskForm
                // key={`tf-${task.id}`}
                newTaskName={newTaskName} 
                newTaskDesc={newTaskDesc}
                onSave={handleAddTask}
                onCancel={() => setIsAddingTask(false)}
              />
            )}
            <OutlineTaskItem
              // key={`ti-${task.id}`}
              task={task}
              level={0}
              isEditing={isEditing} 
              onDelete={handleDeleteTask}
              onSort={handleSortTask}
              onAddSubTask={handleAddSubTask}
              onUpdateTask={handleEditTask}
              onAddBefore={handleAddBefore}
              onAddAfter={handleAddAfter}
              choosed={chosenTaskId}
              onChooseTask={handleChooseTask}
            />
          </Fragment>
        ))} 
        {/* 使用新组件替换原有代码 */}
        {(isAddingTask && addBeforePosition == null) && (
          <OutlineTaskForm
            newTaskName={newTaskName} 
            newTaskDesc={newTaskDesc}
            onSave={handleAddTask}
            onCancel={() => setIsAddingTask(false)}
          />
        )}
      </div>

      <OutlineBatchOperations project_id={project_id} />
      
    </div>
  );
};

export default OutlineTaskList;