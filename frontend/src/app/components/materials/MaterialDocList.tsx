import React, { useState, useEffect, useRef } from 'react';
import { Task } from '@/app/components/materials/TaskItem';
import { LoadingModal } from '@/app/components/general/Loading';
import { getCookie } from '@/lib/cookies';
import axios from 'axios';

export interface FileItem {
  id: string;
  name: string;
  content?: string;
}

interface MaterialDocListProps {
  chosenTask: Task | null;
  onFileSelect: (file: FileItem | null) => void;
  outdated: boolean;
  onRefresh: () => void;
//   selectedFile: FileItem | null;
}

interface FileListAPIResponse {
  documents: FileItem[];
}

export const MaterialDocList: React.FC<MaterialDocListProps> = ({ 
  chosenTask, 
  onFileSelect, 
  outdated,
  onRefresh,
}) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);

  // 获取文件列表
  const getFileList = () => {
    if (chosenTask) {
      const csrftoken = getCookie('csrftoken');
      axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/materials/task/${chosenTask.id}/documents/`,
        { 'task_id': chosenTask.id },
        {
          headers: { 'X-CSRFToken': csrftoken },
          withCredentials: true
        }
      ).then(res => {
        const apiResponse = res.data as FileListAPIResponse;
        setFileList(apiResponse.documents);
      });
    } else {
      setFileList([]);
    }
  }

  // 监听任务切换
  useEffect(() => {
    getFileList();
    setSelectedFile(null);
    onFileSelect(null)
  }, [chosenTask]);

  // 监听是否过时
  useEffect(() => {
    if (!outdated) {
      return;
    }
    getFileList();
    // 检查 selectedFile 是否还存在
    if (selectedFile) {
      const foundFile = fileList.find(file => file.id === selectedFile.id);
      if (!foundFile) {
        setSelectedFile(null);
        onFileSelect(null);
      }
    }
    onRefresh();
  }, [outdated]);

  // 选中文件
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const handleSelectFile = (file: FileItem) => {
    setSelectedFile(file);
    onFileSelect(file);
  }

  // 处理创建文件
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [newFileName, setNewFileName] = useState('');

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsAddingDoc(false);
      setNewFileName('');
      handleCreateDocument();
    }
    // 不会触发
    // if (e.key === 'Escape') {
    //   console.log('Escape');
    //   setIsAddingDoc(false);
    //   setNewFileName('');
    // }
  }

  const handleCreateDocument = () => {

    if (newFileName.trim() === '') {
      return;
    }
    const csrftoken = getCookie('csrftoken');
    if (!chosenTask) {
      return;
    }
    axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/materials/task/${chosenTask.id}/create_document/`,
      { 'name': newFileName, 'content': '' },
      {
        headers: { 'X-CSRFToken': csrftoken },
        withCredentials: true
      }
    ).then(res => {
      const apiResponse = res.data as FileItem;
      getFileList();
      setIsAddingDoc(false);
      setNewFileName('');

      setSelectedFile(apiResponse);
      onFileSelect(apiResponse);
    });
  }

  // 打开 AI 助手
  const [loading, setLoading] = useState(false);
  const [loadingTask, setLoadingTask] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [loadingError, setLoadingError] = useState<boolean>(false);
  const callAITools = (task: Task) => {
    if (!task) {
      return;
    }
    // const csrftoken = getCookie('csrftoken');
    // axios.post(
    //   `${process.env.NEXT_PUBLIC_API_URL}/materials/task/${task.id}/call_ai_tools/`,
    //   {},
    //   {
    //     headers: { 'X-CSRFToken': csrftoken },
    //     withCredentials: true
    //   }
    // ).then(res => {
    //   alert('AI 助手已调用，等待 AI 助手处理中...');
    // });

    
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_API_URL}/materials/start_ai_helper/`);
    ws.onopen = () => {
      setLoading(true);
      setLoadingTask('开启 AI 助手');
      ws.send(JSON.stringify({
        'task_id': task.id,
      }));
    }
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data['status'] === 'success') {
          setLoading(false);
          setLoadingTask('');
          setLoadingStatus('');
          setLoadingError(false);
          // alert('AI 助手已开启');
        } else if (data['status'] === 'error') {
          setLoading(true);
          setLoadingTask('开启 AI 助手');
          setLoadingStatus('AI 助手开启失败');
          setLoadingError(true);
        } else if (data['status'] === 'doing') {
          setLoading(true);
          setLoadingTask('开启 AI 助手');
          setLoadingStatus(data['message']);
          setLoadingError(false);
        }
    }
  }

  return (
    <>
      <LoadingModal 
        isOpen={loading}
        task={loadingTask}
        status={loadingStatus}
        error={loadingError}
        onClose={() => {}}
      />
      <div className="flex justify-between items-center">
        <h3 className="text-lg mb-3 font-bold">素材文件</h3>
        <div className="flex justify-end space-x-2">
          <button 
            className="bg-blue-500 text-white px-2 py-1 rounded text-sm mb-3"
            onClick={() => {callAITools(chosenTask)}}
          >
            AI 助手
          </button>
          <button 
            className="bg-white text-blue-500 border border-blue-500 px-2 py-1 rounded text-sm mb-3"  
            onClick={() => {
                setIsAddingDoc(true);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 200);
            }}
            disabled={!chosenTask}
          >
            新建文件
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {fileList.map(file => (
          <div 
            key={file.id}
            className={`p-2 hover:bg-gray-200 cursor-pointer flex items-top text-gray-700 ${selectedFile?.id === file.id ? 'bg-gray-100' : ''}`}
            onClick={() => handleSelectFile(file)}
          >
            <div className="w-4 h-4 mt-1 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1 border-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.29 7 12 12 20.71 7"></polyline>
                <line x1="12" y1="22" x2="12" y2="12"></line>
              </svg>
            </div>
            {file.name}
          </div>
        ))}

        {/* 新建文件输入区域 */}
        {isAddingDoc && (
          <div className="p-2 border border-dashed border-gray-300 rounded mt-2 items-center space-x-2">
            <div className="border-b border-gray-300 border-dashed">
                <input
                ref={inputRef}
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyUp={handleInputKeyUp}
                className="flex-1 border-none outline-none text-base w-full"
                placeholder="输入文件名"
                />
            </div>
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={handleCreateDocument}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
              >
                确定
              </button>
              <button
                onClick={() => {
                  setIsAddingDoc(false);
                  setNewFileName('');
                }}
                className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};