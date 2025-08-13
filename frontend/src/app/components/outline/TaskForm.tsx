import React, { useRef, useState, useEffect } from 'react';

interface OutlineTaskFormProps {
  id?: number | string;
  newTaskName: string;
  newTaskDesc: string;
  onSave: (name: string, desc: string) => void;
  onCancel: () => void;
}

export const OutlineTaskForm: React.FC<OutlineTaskFormProps> = ({
  id,
  newTaskName,
  newTaskDesc,
  onSave,
  onCancel,
}) => {
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [NewTaskName, setNewTaskName] = useState(newTaskName);
  const [NewTaskDesc, setNewTaskDesc] = useState(newTaskDesc);

  // 自动调整textarea高度
  const adjustTextareaHeight = () => {
    if (descInputRef.current) {
      // 重置高度以获取正确的scrollHeight
      descInputRef.current.style.height = 'auto';
      // 设置高度为内容高度，限制最大高度
      const newHeight = Math.min(descInputRef.current.scrollHeight, 80);
      descInputRef.current.style.height = `${newHeight}px`;
    }
  };

  // 初始化和内容变化时调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [NewTaskDesc]);

  const handleNameKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      descInputRef.current?.focus();
    }
  };

  // desc 回车提交
  const handleDescKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      onSave(newTaskName, newTaskDesc);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [onCancel]);

  return (
    <div ref={formRef} className="border border-blue-500 p-2 bg-white rounded-lg shadow-sm">
      <input
        name="newTaskName"
        type="text"
        value={NewTaskName}
        id={`newTaskName-${id}`}
        placeholder="输入任务名称"
        onKeyUp={handleNameKeyUp}
        onChange={(e) => {
          setNewTaskName(e.target.value);
        }}
        className="text-sm font-mediumb w-full outline-none"
      />
      <textarea
        ref={descInputRef}
        name="newTaskDesc"
        value={NewTaskDesc}
        placeholder="输入任务描述"
        onKeyUp={handleDescKeyUp}
        onChange={(e) => {
          setNewTaskDesc(e.target.value);
          adjustTextareaHeight();
        }}
        className="text-xs text-gray-600 break-words mb-2 w-full outline-none min-h-[20px]"
      />
      <div className="flex justify-end space-x-2 pt-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          取消
        </button>
        <button
          onClick={() => {
            onSave(NewTaskName, NewTaskDesc);
            onCancel();
          }}
          className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          保存
        </button>
      </div>
    </div>
  );
};