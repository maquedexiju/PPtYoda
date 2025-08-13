import React, { useState, useRef, useEffect } from 'react';
import {TaskForm} from './TaskForm';

export interface Task {
  id: number | string;
  name: string;
  desc: string;
  status: 'todo' | 'doing' | 'done';
  sub_tasks: Task[];
}

interface TaskItemProps {
  task: Task;
  level: number;
  isEditing: boolean;
  onStatusChange: (taskId: number, newStatus: 'todo' | 'doing' | 'done') => Promise<void>;
  onDelete: (taskId: number) => void;
  onSort: (direction: 'up' | 'down', taskId: number) => void;
  // 新增回调函数
  onAddSubTask: (parentTaskId: number, subTask: Partial<Task>) => void;
  onUpdateTask: (taskId: number, updates: Partial<Task>) => void;
  // 选中逻辑
  choosed: number | null;
  onChooseTask: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, level, isEditing, 
  onStatusChange, onDelete, onSort,
  onAddSubTask, onUpdateTask, 
  choosed, onChooseTask
}) => {
  const [showAddSubTaskForm, setShowAddSubTaskForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editDesc, setEditDesc] = useState(task.desc);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditName(task.name);
    setEditDesc(task.desc);
  }, [task]);


  const [isChosen, setIsChosen] = useState(choosed === task.id);
  useEffect(() => {
    setIsChosen(choosed === task.id);
  }, [choosed]);


  const handleStatusClick = async () => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await onStatusChange(task.id, newStatus);
  };

  const handleAddSubTaskClick = (taskId: number) => {
    setShowAddSubTaskForm(true);
    // 等待 0.2 秒
    setTimeout(() => {
      // 聚焦到输入框
      (document.querySelector(`input[id="newTaskName-${taskId}"]`) as HTMLInputElement)?.focus();
    }, 200);
  };

  const handleAddSubTask = (name: string, desc: string) => {
    console.log(name, desc);
    if (name.trim()) {
      onAddSubTask(task.id, {
        name: name,
        desc: desc,
        status: 'todo',
        sub_tasks: []
      });
      setShowAddSubTaskForm(false);
    }
  };

  const handleUpdateTask = () => {
    if (editName.trim()) {
      onUpdateTask(task.id, {
        name: editName,
        desc: editDesc
      });
      setShowEditForm(false);
    }
  };

  return (
    <div 
      className={`border border-gray-300 rounded-lg p-2 ml-${level * 4}  shadow-sm transition-all duration-200 ${isChosen ? 'bg-gray-100' : 'bg-white'}`} 
    >
      {/* 原有内容区域 - 编辑模式下隐藏 */}
      {!showEditForm ? (
        <div className="flex items-center justify-between">
          {/* 原有状态和编辑控制内容 */}
          {isEditing ? (
            <div className="flex items-start space-x-3">
              {/* 上下箭头区域 - 蓝色背景上下排布 */}
              <div className="flex flex-col bg-blue-100 p-1 rounded">
                <button
                  onClick={() => onSort?.('up', task.id)}
                  className="text-blue-600 hover:text-blue-800"
                  aria-label="Move up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onSort?.('down', task.id)}
                  className="text-blue-600 hover:text-blue-800 mt-1"
                  aria-label="Move down"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* 右侧内容区域 - 撑满空间并上下排布 */}
              <div className="flex-1 flex flex-col">
                {/* 标题、删除按钮区域 */}
                <h3 className={`text-base font-medium truncate flex-1 line-clamp-1`}>{task.name}</h3>
                {/* 描述区域 */}
                <p className={`text-xs text-gray-600 break-words mb-2 line-clamp-2 ${task.status === 'done' ? 'line-through' : ''}`}>{task.desc}</p>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between w-full">
                <h3 
                  onClick={() => { onChooseTask(task); }}
                  className={`text-base font-medium truncate flex-1 cursor-pointer ${task.status === 'done' ? 'line-through' : ''}`}
                >
                  {task.name}
                </h3>
                {/* 非编辑状态显示状态图标 */}
                <button onClick={handleStatusClick} className="p-1 cursor-pointer">
                  {task.status === 'done' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
              <p 
                onClick={() => { onChooseTask(task); }}
                className={`text-xs text-gray-600 break-words mb-2 line-clamp-2 cursor-pointer ${task.status === 'done' ? 'line-through' : ''}`}
              >
                {task.desc}
              </p>
            </div>
          )}
        </div>
      ) : (
        // 编辑表单
        <TaskForm 
          newTaskName={editName} 
          newTaskDesc={editDesc} 
          onSave={(name, desc) => onUpdateTask(task.id, { "name": name, "desc": desc })}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {/* 添加子任务、编辑和删除 */}
      {(isEditing && !showAddSubTaskForm && !showEditForm) && (
        <div className="flex justify-end space-x-2 mt-2">
          <button 
            onClick={() => setShowEditForm(!showEditForm)} 
            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (window.confirm('是否要删除任务？')) {
                onDelete(task.id);
              }
            }}
            className="px-2 py-1 text-xs bg-red-100 text-red-500 rounded hover:text-red-700"
            aria-label="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button 
            onClick={() => handleAddSubTaskClick(task.id)}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            添加子任务
          </button>
        </div>
      )}

      {/* 子任务列表 */}
      {task.sub_tasks && task.sub_tasks.length > 0 && (
        <div className="mt-3 space-y-2" ref={scrollRef}>
          {task.sub_tasks.map(subTask => (
            <TaskItem
              key={subTask.id}
              task={subTask} 
              level={level + 1} 
              isEditing={isEditing} 
              onStatusChange={onStatusChange} 
              onDelete={onDelete} 
              onSort={onSort} 
              onAddSubTask={onAddSubTask} 
              onUpdateTask={onUpdateTask} 
              choosed={choosed}
              onChooseTask={onChooseTask}
            />
          ))}
        </div>
      )}

      {/* 添加子任务表单 */}
      {showAddSubTaskForm && (
        // <div className="mt-2 pl-4 border-l-2 border-blue-200">
        <div className="mt-2">
          <TaskForm
            id={task.id}
            newTaskName=''
            newTaskDesc='' 
            // onSave={(name, desc) => onAddSubTask(task.id, { "name": name, "desc": desc })}
            onSave={handleAddSubTask}
            onCancel={() => setShowAddSubTaskForm(false)}
          />
        </div>
      )}
    </div>
  );
};