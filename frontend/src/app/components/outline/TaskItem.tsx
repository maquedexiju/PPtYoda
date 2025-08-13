import React, { useState, useRef, useEffect, Fragment } from 'react';
import {OutlineTaskForm} from './TaskForm';

import { BaseTask } from '@/lib/task'

export interface OutlineTask extends BaseTask {
  desc: string;
  p_type: string;
  sub_tasks: OutlineTask[];
}

interface TaskItemProps {
  task: OutlineTask;
  level: number;
  isEditing: boolean;
  onDelete: (taskId: number | string) => void;
  onSort: (direction: 'up' | 'down', taskId: number | string) => void;
  // 新增回调函数
  onAddSubTask: (parentTaskId: number | string, subTask: Partial<OutlineTask>, position: number | string | null) => void;
  onUpdateTask: (taskId: number | string, updates: Partial<OutlineTask>) => void;
  onAddBefore: (position: number | string, type: string) => void;
  onAddAfter: (position: number | string, type: string) => void;
  // 选中逻辑
  choosed: number | null;
  onChooseTask: (task: OutlineTask) => void;
}


const ChooseOutlineType: React.FC<{
  onChosen: (pType: string) => void;
}> = ({ onChosen }) => {

  return (
    <div className="flex flex-col items-center w-32 bg-gray-100 border border-gray-200 rounded py-2">
      <button className="text-sm hover:bg-gray-200 px-2 py-1 w-full" onClick={() => onChosen('content')}>创作页</button>
      <button className="text-sm hover:bg-gray-200 px-2 py-1 w-full" onClick={() => onChosen('template')}>预置页</button>
    </div>
  );
}


export const OutlineTaskItem: React.FC<TaskItemProps> = ({ 
  task, level, isEditing, 
  onDelete, onSort,
  onAddSubTask, onUpdateTask, 
  onAddBefore, onAddAfter,
  choosed, onChooseTask
}) => {
  
  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editDesc, setEditDesc] = useState(task.desc);
  const [editType, setEditType] = useState(task.p_type);
  const scrollRef = useRef<HTMLDivElement>(null);


  const [isChosen, setIsChosen] = useState(choosed === task.id);
  useEffect(() => {
    setIsChosen(choosed === task.id);
  }, [choosed]);

  const handleUpdateTask = () => {
    if (editName.trim()) {
      onUpdateTask(task.id, {
        name: editName,
        desc: editDesc
      });
      setShowEditForm(false);
    }
  };

  // 处理子任务添加
  const [showAddSubTaskForm, setShowAddSubTaskForm] = useState(false);
  const [addBeforePosition, setAddBeforePosition] = useState<number | string | null>(null);
    const handleAddSubTaskClick = (taskId: number | string, type: string) => {
    setShowAddSubTaskForm(true);
    setEditType(type);
    // 等待 0.2 秒
    setTimeout(() => {
      // 聚焦到输入框
      (document.querySelector(`input[id="newTaskName-${taskId}"]`) as HTMLInputElement)?.focus();
    }, 200);
  };
  // 层层上传，给定 parentTaskId 和 当前添加的内容，最后完成添加
  const handleAddSubTask = (name: string, desc: string) => {
    console.log(name, desc);
    if (name.trim()) {
      onAddSubTask(task.id, {
        name: name,
        desc: desc,
        p_type: editType,
        sub_tasks: []
      }, addBeforePosition);
      setShowAddSubTaskForm(false);
    }
  };

  // 处理子任务上传的 addBefore 回调
  const handleAddBefore = (position: number | string, type: string) => {
    setAddBeforePosition(position);
    setEditType(type);
    setShowAddSubTaskForm(true);
    setTimeout(() => {
      // 聚焦到输入框
      console.log(task.id);
      (document.querySelector(`input[id="newTaskName-${task.id}"]`) as HTMLInputElement)?.focus();
    }, 200);
  };
  // 处理子任务上传的 addAfter 回调
  const handleAddAfter = (position: number | string, type: string) => {
    // 找到后一个 id 是 position 的 sub_task 或者为 null
    const sub_tasks = task.sub_tasks;
    const index = sub_tasks.findIndex(sub_task => sub_task.id === position);
    if (index == sub_tasks.length - 1) {
      setAddBeforePosition(null);
    } else {
      setAddBeforePosition(sub_tasks[index + 1].id);
    }
    setShowAddSubTaskForm(true);
    setEditType(type);
    setTimeout(() => {
      // 聚焦到输入框
      (document.querySelector(`input[id="newTaskName-${task.id}"]`) as HTMLInputElement)?.focus();
    }, 200);
  };
  // 处理添加子任务
  const startAddSubTask = (type: string) => {
    console.log('startAddSubTask', type);
    setEditType(type);
    setAddBeforePosition(null)
    setShowAddSubTaskForm(true);
    setTimeout(() => {
      // 聚焦到输入框
      (document.querySelector(`input[id="newTaskName-${task.id}"]`) as HTMLInputElement)?.focus();
    }, 200);
  };

  return (
    <div 
      className={`border border-gray-300 rounded-lg p-2 ml-${level * 4}  shadow-sm transition-all duration-200 ${isChosen ? 'bg-gray-100' : 'bg-white'}`} 
    >
      {/* 原有内容区域 - 编辑模式下隐藏 */}
      {!showEditForm ? (
        <> 
            {/* 原有状态和编辑控制内容 */}
            {isEditing ? (
              <div className="flex items-center justify-between">
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
                    <p className={`text-xs text-gray-600 break-words mb-2 line-clamp-2`}>{task.desc}</p>
                  </div>
                </div>
              </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <h3 
                  onClick={() => { onChooseTask(task); }}
                  className={`text-base font-medium truncate flex-1 cursor-pointer w-full`}
                >
                  {task.name}
                </h3>
              </div>
              <p 
                onClick={() => { onChooseTask(task); }}
                className={`text-xs text-gray-600 break-words mb-2 line-clamp-2 cursor-pointer w-full`}
              >
                {task.desc}
              </p>
            </div>
          )}
        </>
      ) : (
        // 编辑表单
        <OutlineTaskForm 
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
          {/* 上方增加任务 */}
          <div className="relative group">
            <button 
              // onClick={() => onAddBefore(task.id)}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="6" x2="12" y2="10" />
                <line x1="10" y1="8" x2="14" y2="8" />
                <rect x="5" y="14" width="14" height="6" rx="2" />
              </svg>
            </button>
            <div className="absolute bottom-full right-0 hidden group-hover:block">
              <ChooseOutlineType onChosen={(pType) => onAddBefore(task.id, pType)} />
            </div>
          </div>
          {/* 下方增加任务 */}
          <div className="relative group">
            <button 
              // onClick={() => onAddAfter(task.id)}
              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="6" width="14" height="6" rx="2" />
                <line x1="12" y1="16" x2="12" y2="20" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
            </button>
            <div className="absolute bottom-full right-0 hidden group-hover:block">
              <ChooseOutlineType onChosen={(pType) => onAddAfter(task.id, pType)} />
            </div>
          </div>

          {(level < 2) && (
            <div className="relative group">
              <button 
                // onClick={() => handleAddSubTaskClick(task.id)}
                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
              >
                {/* 添加子页 */}
                <svg viewBox="-170 -170 1364 1364" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2088" width="24" height="24"><path d="M160 352m0 0l576 0q0 0 0 0l0 96q0 0 0 0l-576 0q0 0 0 0l0-96q0 0 0 0Z" fill="#2c2c2c" p-id="2089"></path><path d="M142.08 64C116.64 64 96 85.504 96 112v384q0 74.848 27.776 143.264 26.816 66.048 75.712 116.96 48.864 50.88 112.256 78.848Q377.44 864 449.28 864h368.64c25.44 0 46.08-21.504 46.08-48s-20.64-48-46.08-48H449.28q-108.16 0-184.64-79.68-76.48-79.68-76.48-192.32v-384c0-26.496-20.64-48-46.08-48z" fill="#2c2c2c" p-id="2090"></path><path d="M672 400a144 144 0 1 0 288 0 144 144 0 1 0-288 0Z" fill="#2c2c2c" p-id="2091"></path><path d="M960 400q0 3.52-0.16 7.04-0.192 3.552-0.544 7.072-0.32 3.52-0.864 7.04-0.512 3.488-1.184 6.944-0.704 3.456-1.568 6.88-0.864 3.456-1.888 6.816-1.024 3.392-2.24 6.72-1.152 3.328-2.528 6.592-1.344 3.264-2.88 6.464-1.472 3.2-3.136 6.304-1.664 3.136-3.52 6.144-1.792 3.04-3.744 5.984-1.984 2.944-4.096 5.76-2.08 2.88-4.32 5.6-2.24 2.72-4.64 5.344-2.368 2.624-4.864 5.12t-5.12 4.864q-2.624 2.368-5.344 4.64-2.752 2.24-5.568 4.32-2.88 2.112-5.76 4.096-2.976 1.952-6.016 3.776-3.008 1.824-6.144 3.488-3.104 1.664-6.304 3.168-3.2 1.504-6.464 2.88-3.264 1.344-6.592 2.528t-6.72 2.24q-3.36 0.992-6.816 1.856-3.424 0.864-6.88 1.568-3.456 0.672-6.976 1.184-3.488 0.544-7.008 0.864-3.52 0.352-7.04 0.544-3.52 0.16-7.072 0.16-3.52 0-7.04-0.16-3.552-0.192-7.072-0.544-3.52-0.32-7.04-0.864-3.488-0.512-6.944-1.184-3.456-0.704-6.88-1.568-3.456-0.864-6.816-1.888-3.392-1.024-6.72-2.24-3.328-1.152-6.592-2.528-3.264-1.344-6.464-2.88-3.2-1.472-6.304-3.136-3.136-1.664-6.144-3.52-3.04-1.792-5.984-3.744-2.944-1.984-5.76-4.096-2.88-2.08-5.6-4.32-2.72-2.24-5.344-4.64-2.624-2.368-5.12-4.864t-4.864-5.12q-2.368-2.624-4.64-5.344-2.24-2.752-4.32-5.568-2.112-2.88-4.096-5.76-1.952-2.976-3.776-6.016-1.824-3.008-3.488-6.144-1.664-3.104-3.168-6.304-1.504-3.2-2.88-6.464-1.344-3.264-2.528-6.592t-2.24-6.72q-0.992-3.36-1.856-6.816-0.864-3.424-1.568-6.88-0.672-3.456-1.184-6.976-0.544-3.488-0.864-7.008-0.352-3.52-0.544-7.04Q672 403.52 672 400q0-3.52 0.16-7.04 0.192-3.552 0.544-7.072 0.32-3.52 0.864-7.04 0.512-3.488 1.184-6.944 0.704-3.456 1.568-6.88 0.864-3.456 1.888-6.816 1.024-3.392 2.24-6.72 1.152-3.328 2.528-6.592 1.344-3.264 2.848-6.464 1.504-3.2 3.2-6.304 1.632-3.136 3.456-6.144 1.824-3.04 3.776-5.984 1.984-2.944 4.096-5.76 2.08-2.88 4.32-5.6 2.24-2.72 4.64-5.344 2.368-2.624 4.864-5.12t5.12-4.864q2.624-2.368 5.344-4.64 2.752-2.24 5.568-4.32 2.88-2.112 5.76-4.096 2.976-1.952 6.016-3.776 3.008-1.824 6.144-3.488 3.104-1.664 6.304-3.168 3.2-1.504 6.464-2.88 3.264-1.344 6.592-2.528t6.72-2.24q3.36-0.992 6.816-1.856 3.424-0.864 6.88-1.568 3.456-0.672 6.976-1.184 3.488-0.544 7.008-0.864 3.52-0.352 7.04-0.544Q812.48 256 816 256q3.52 0 7.04 0.16 3.552 0.192 7.072 0.544 3.52 0.32 7.04 0.864 3.488 0.512 6.944 1.184 3.456 0.704 6.88 1.568 3.456 0.864 6.816 1.888 3.392 1.024 6.72 2.24 3.328 1.152 6.592 2.528 3.264 1.344 6.464 2.848 3.2 1.504 6.304 3.2 3.136 1.632 6.144 3.456 3.04 1.824 5.984 3.776 2.944 1.984 5.76 4.096 2.88 2.08 5.6 4.32 2.72 2.24 5.344 4.64 2.624 2.368 5.12 4.864t4.864 5.12q2.368 2.624 4.64 5.344 2.24 2.752 4.32 5.568 2.112 2.88 4.096 5.76 1.952 2.976 3.776 6.016 1.824 3.008 3.488 6.144 1.664 3.104 3.168 6.304 1.504 3.2 2.88 6.464 1.344 3.264 2.528 6.592t2.24 6.72q0.992 3.36 1.856 6.816 0.864 3.424 1.568 6.88 0.672 3.456 1.184 6.976 0.544 3.488 0.864 7.008 0.352 3.52 0.544 7.04 0.16 3.52 0.16 7.072z m-96 0q0-2.368-0.224-4.704t-0.704-4.672q-0.448-2.304-1.152-4.544-0.672-2.24-1.6-4.448-0.864-2.176-1.984-4.256t-2.432-4.032q-1.28-1.984-2.784-3.808-1.504-1.824-3.2-3.488-1.632-1.664-3.456-3.168-1.824-1.472-3.808-2.784-1.92-1.312-4.032-2.432-2.08-1.12-4.256-2.016-2.176-0.896-4.448-1.6-2.24-0.64-4.544-1.12-2.336-0.48-4.672-0.704Q818.368 352 816 352t-4.704 0.224q-2.336 0.224-4.672 0.704-2.304 0.448-4.544 1.152-2.24 0.672-4.448 1.6-2.176 0.864-4.256 1.984t-4.032 2.432q-1.984 1.28-3.808 2.784-1.824 1.504-3.488 3.2-1.664 1.632-3.168 3.456-1.472 1.824-2.784 3.808-1.312 1.92-2.432 4.032-1.12 2.08-2.016 4.256-0.896 2.176-1.6 4.448-0.64 2.24-1.12 4.544-0.48 2.336-0.704 4.672-0.224 2.336-0.224 4.704t0.224 4.704q0.224 2.336 0.704 4.672 0.448 2.304 1.152 4.544 0.672 2.24 1.6 4.448 0.864 2.176 1.984 4.256t2.432 4.032q1.28 1.984 2.784 3.808 1.504 1.824 3.2 3.488 1.632 1.664 3.456 3.168 1.824 1.472 3.808 2.784 1.92 1.312 4.032 2.432 2.08 1.12 4.256 2.016 2.176 0.896 4.448 1.6 2.24 0.64 4.544 1.12 2.336 0.48 4.672 0.704 2.336 0.224 4.704 0.224t4.704-0.224q2.336-0.224 4.672-0.704 2.304-0.448 4.544-1.152 2.24-0.672 4.448-1.6 2.176-0.864 4.256-1.984t4.032-2.432q1.984-1.28 3.808-2.784 1.824-1.504 3.488-3.2 1.664-1.632 3.168-3.456 1.472-1.824 2.784-3.808 1.312-1.92 2.432-4.032 1.12-2.08 2.016-4.256 0.896-2.176 1.6-4.448 0.64-2.24 1.12-4.544 0.48-2.336 0.704-4.672 0.224-2.336 0.224-4.704z" fill="#2c2c2c" p-id="2092"></path><path d="M672 816a144 144 0 1 0 288 0 144 144 0 1 0-288 0Z" fill="#2c2c2c" p-id="2093"></path><path d="M960 816q0 3.52-0.16 7.04-0.192 3.552-0.544 7.072-0.32 3.52-0.864 7.04-0.512 3.488-1.184 6.944-0.704 3.456-1.568 6.88-0.864 3.456-1.888 6.816-1.024 3.392-2.24 6.72-1.152 3.328-2.528 6.592-1.344 3.264-2.88 6.464-1.472 3.2-3.136 6.304-1.664 3.136-3.52 6.144-1.792 3.04-3.744 5.984-1.984 2.944-4.096 5.76-2.08 2.88-4.32 5.6-2.24 2.72-4.64 5.344-2.368 2.624-4.864 5.12t-5.12 4.864q-2.624 2.368-5.344 4.64-2.752 2.24-5.568 4.32-2.88 2.112-5.76 4.096-2.976 1.952-6.016 3.776-3.008 1.824-6.144 3.488-3.104 1.664-6.304 3.168-3.2 1.504-6.464 2.88-3.264 1.344-6.592 2.528t-6.72 2.24q-3.36 0.992-6.816 1.856-3.424 0.864-6.88 1.568-3.456 0.672-6.976 1.184-3.488 0.544-7.008 0.864-3.52 0.352-7.04 0.544-3.52 0.16-7.072 0.16-3.52 0-7.04-0.16-3.552-0.192-7.072-0.544-3.52-0.32-7.04-0.864-3.488-0.512-6.944-1.184-3.456-0.704-6.88-1.568-3.456-0.864-6.816-1.888-3.392-1.024-6.72-2.24-3.328-1.152-6.592-2.528-3.264-1.344-6.464-2.88-3.2-1.472-6.304-3.136-3.136-1.664-6.144-3.52-3.04-1.792-5.984-3.744-2.944-1.984-5.76-4.096-2.88-2.08-5.6-4.32-2.72-2.24-5.344-4.64-2.624-2.368-5.12-4.864t-4.864-5.12q-2.368-2.624-4.64-5.344-2.24-2.752-4.32-5.568-2.112-2.88-4.096-5.76-1.952-2.976-3.776-6.016-1.824-3.008-3.488-6.144-1.664-3.104-3.168-6.304-1.504-3.2-2.88-6.464-1.344-3.264-2.528-6.592t-2.24-6.72q-0.992-3.36-1.856-6.816-0.864-3.424-1.568-6.88-0.672-3.456-1.184-6.976-0.544-3.488-0.864-7.008-0.352-3.52-0.544-7.04Q672 819.52 672 816q0-3.52 0.16-7.04 0.192-3.552 0.544-7.072 0.32-3.52 0.864-7.04 0.512-3.488 1.184-6.944 0.704-3.456 1.568-6.88 0.864-3.456 1.888-6.816 1.024-3.392 2.24-6.72 1.152-3.328 2.528-6.592 1.344-3.264 2.848-6.464 1.504-3.2 3.2-6.304 1.632-3.136 3.456-6.144 1.824-3.04 3.776-5.984 1.984-2.944 4.096-5.76 2.08-2.88 4.32-5.6 2.24-2.72 4.64-5.344 2.368-2.624 4.864-5.12t5.12-4.864q2.624-2.368 5.344-4.64 2.752-2.24 5.568-4.32 2.88-2.112 5.76-4.096 2.976-1.952 6.016-3.776 3.008-1.824 6.144-3.488 3.104-1.664 6.304-3.168 3.2-1.504 6.464-2.88 3.264-1.344 6.592-2.528t6.72-2.24q3.36-0.992 6.816-1.856 3.424-0.864 6.88-1.568 3.456-0.672 6.976-1.184 3.488-0.544 7.008-0.864 3.52-0.352 7.04-0.544 3.52-0.16 7.072-0.16 3.52 0 7.04 0.16 3.552 0.192 7.072 0.544 3.52 0.32 7.04 0.864 3.488 0.512 6.944 1.184 3.456 0.704 6.88 1.568 3.456 0.864 6.816 1.888 3.392 1.024 6.72 2.24 3.328 1.152 6.592 2.528 3.264 1.344 6.464 2.848 3.2 1.504 6.304 3.2 3.136 1.632 6.144 3.456 3.04 1.824 5.984 3.776 2.944 1.984 5.76 4.096 2.88 2.08 5.6 4.32 2.72 2.24 5.344 4.64 2.624 2.368 5.12 4.864t4.864 5.12q2.368 2.624 4.64 5.344 2.24 2.752 4.32 5.568 2.112 2.88 4.096 5.76 1.952 2.976 3.776 6.016 1.824 3.008 3.488 6.144 1.664 3.104 3.168 6.304 1.504 3.2 2.88 6.464 1.344 3.264 2.528 6.592t2.24 6.72q0.992 3.36 1.856 6.816 0.864 3.424 1.568 6.88 0.672 3.456 1.184 6.976 0.544 3.488 0.864 7.008 0.352 3.52 0.544 7.04 0.16 3.52 0.16 7.072z m-96 0q0-2.368-0.224-4.704t-0.704-4.672q-0.448-2.304-1.152-4.544-0.672-2.24-1.6-4.448-0.864-2.176-1.984-4.256t-2.432-4.032q-1.28-1.984-2.784-3.808-1.504-1.824-3.2-3.488-1.632-1.664-3.456-3.168-1.824-1.472-3.808-2.784-1.92-1.312-4.032-2.432-2.08-1.12-4.256-2.016-2.176-0.896-4.448-1.6-2.24-0.64-4.544-1.12-2.336-0.48-4.672-0.704Q818.368 768 816 768t-4.704 0.224q-2.336 0.224-4.672 0.704-2.304 0.448-4.544 1.152-2.24 0.672-4.448 1.6-2.176 0.864-4.256 1.984t-4.032 2.432q-1.984 1.28-3.808 2.784-1.824 1.504-3.488 3.2-1.664 1.632-3.168 3.456-1.472 1.824-2.784 3.808-1.312 1.92-2.432 4.032-1.12 2.08-2.016 4.256-0.896 2.176-1.6 4.448-0.64 2.24-1.12 4.544-0.48 2.336-0.704 4.672-0.224 2.336-0.224 4.704t0.224 4.704q0.224 2.336 0.704 4.672 0.448 2.304 1.152 4.544 0.672 2.24 1.6 4.448 0.864 2.176 1.984 4.256t2.432 4.032q1.28 1.984 2.784 3.808 1.504 1.824 3.2 3.488 1.632 1.664 3.456 3.168 1.824 1.472 3.808 2.784 1.92 1.312 4.032 2.432 2.08 1.12 4.256 2.016 2.176 0.896 4.448 1.6 2.24 0.64 4.544 1.12 2.336 0.48 4.672 0.704 2.336 0.224 4.704 0.224t4.704-0.224q2.336-0.224 4.672-0.704 2.304-0.448 4.544-1.152 2.24-0.672 4.448-1.6 2.176-0.864 4.256-1.984t4.032-2.432q1.984-1.28 3.808-2.784 1.824-1.504 3.488-3.2 1.664-1.632 3.168-3.456 1.472-1.824 2.784-3.808 1.312-1.92 2.432-4.032 1.12-2.08 2.016-4.256 0.896-2.176 1.6-4.448 0.64-2.24 1.12-4.544 0.48-2.336 0.704-4.672 0.224-2.336 0.224-4.704z" fill="#2c2c2c" p-id="2094"></path></svg>
              </button>
              <div className="absolute bottom-full right-0 hidden group-hover:block">
                <ChooseOutlineType onChosen={(pType) => startAddSubTask(pType)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 子任务列表 */}
      {task.sub_tasks && task.sub_tasks.length > 0 && (
        <div className="mt-3 space-y-2" ref={scrollRef}>
          {task.sub_tasks.map(subTask => (
            <Fragment key={subTask.id}>
              {(addBeforePosition === subTask.id && showAddSubTaskForm) && (
                <OutlineTaskForm
                  id={task.id}
                  // key={`tf-${subTask.id}`}
                  newTaskName=''
                  newTaskDesc='' 
                  onSave={handleAddSubTask}
                  onCancel={() => {
                    setAddBeforePosition(null)
                    setShowAddSubTaskForm(false)
                  }}
                />
              )}
              <OutlineTaskItem
                // key={`ti-${subTask.id}`}
                task={subTask} 
                level={level + 1} 
                isEditing={isEditing} 
                onDelete={onDelete} 
                onSort={onSort} 
                onAddSubTask={onAddSubTask} 
                onUpdateTask={onUpdateTask} 
                onAddBefore={handleAddBefore}
                onAddAfter={handleAddAfter}
                choosed={choosed}
                onChooseTask={onChooseTask}
              />
            </Fragment>
          ))}
        </div>
      )}

      {/* 添加子任务表单 */}
      {(showAddSubTaskForm && level < 2 && addBeforePosition === null) && (
        // <div className="mt-2 pl-4 border-l-2 border-blue-200">
        <div className="mt-2">
          <OutlineTaskForm
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