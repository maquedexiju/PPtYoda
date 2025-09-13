import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { FileItem } from './MaterialDocList';

interface MaterialDocContentProps {
  selectedFile: FileItem | null;
  onContentChange: (file: FileItem | null) => void;
}

interface DocumentContentResponse {
  id: string;
  name: string;
  content: string;
}

export const MaterialDocContent: React.FC<MaterialDocContentProps> = ({ selectedFile, onContentChange }) => {
  const [documentContent, setDocumentContent] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isModified, setIsModified] = useState<boolean>(false);
  const isModifiedRef = useRef<boolean>(false);
  const selectedFileRef = useRef<FileItem | null>(selectedFile);

  // 获取文档内容
  useEffect(() => {
    remindSave();
    selectedFileRef.current = selectedFile;

    if (selectedFile) {
      fetchDocumentContent(selectedFile.id);
      setDocumentTitle(selectedFile.name);
      setDocumentContent(selectedFile.content || '');
      
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 200);
    } else {
      setDocumentTitle('');
      setDocumentContent('');
    }
  }, [selectedFile]);

  // 获取文档详情的API调用
  const fetchDocumentContent = (documentId: string) => {
    setIsLoading(true);
    setError(null);

    const csrftoken = getCookie('csrftoken');
    axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/materials/document/${documentId}/`,
      { 'document_id': documentId },
      {
        headers: { 'X-CSRFToken': csrftoken },
        withCredentials: true
      }
    )
    .then(res => {
      const data = res.data as DocumentContentResponse;
      setDocumentContent(data.content || '');
      setDocumentTitle(data.name);
      setIsLoading(false);
    })
    .catch(err => {
      setError('无法加载文档内容，请重试');
      console.error('Error fetching document content:', err);
    })
  };

  // 进行文档保存
  const saveDocument = async () => {
    // const doc_id = selectedFile?.id || '';
    const doc_id = selectedFileRef.current?.id || '';
    const name = documentTitle.trim();
    const content = documentContent.trim();

    if (doc_id && name) {
      setIsLoading(false);

      const csrftoken = getCookie('csrftoken');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/materials/document/${doc_id}/update/`,
        { 'name': name, 'content': content },
        {
          headers: { 'X-CSRFToken': csrftoken },
          withCredentials: true
        }
      )
      .then(res => {
        setIsLoading(false);
        setError(null);
      })
      .catch(err => {
        setError('无法保存文档内容，请重试');
        console.error('Error saving document content:', err);
      })
    }
  };

  // 进行文档删除
  const deleteDocument = async () => {
    const doc_id = selectedFile?.id || '';
    if (doc_id) {
      setIsLoading(true);

      const csrftoken = getCookie('csrftoken');
      try {
        const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/materials/document/${doc_id}/delete/`,
            { 'document_id': doc_id },
            {
            headers: { 'X-CSRFToken': csrftoken },
            withCredentials: true
            }
        )
        setIsLoading(false);
        return response.data;
      } catch (err) {
        setError('无法删除文档，请重试');
        console.error('Error deleting document:', err);
      }
      
    //     setIsLoading(false);
    //     setError(null);
    //     return 'hi';
    //   })
    //   .catch(err => {
    //     setError('无法删除文档，请重试');
    //     console.error('Error deleting document:', err);
    //   })
    }
  };

  // 处理标题变更
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentTitle(e.target.value);
    setIsModified(true);
  };

  // 处理内容变更
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentContent(e.target.value);
    setIsModified(true);
  };

  // 处理保存
  const handleSave = async () => {
    if (selectedFile) {
      if (documentTitle.trim()) {
        await saveDocument();
        onContentChange(selectedFile);
        setIsModified(false);
      }
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (selectedFile) {
      if (window.confirm('是否要删除文件？')) {
        const result = await deleteDocument();
        console.log(result);
        onContentChange(null);
      }
    }
  };

  // 销毁组件时，提醒用户保存
    useEffect(() => {
        isModifiedRef.current = isModified;
    }, [isModified]);
    useEffect(() => {

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // remindSave(); // 无法执行，会提示 Blocked confirm('是否要保存修改？') during beforeunload.
            return '';
        }
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            remindSave();
        }
    }, []);

    // 提醒保存
    const remindSave = () => {
        console.log('in remind save', isModified);
        if (isModifiedRef.current) {
            if (window.confirm('是否要保存修改？')) {
                saveDocument().then(() => {
                    setIsModified(false);
                });
            }
        }
    }

  // 无文件选择状态
  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-500">
        请选择文件
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-500">
        加载中...
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full text-red-500">
        {error}
      </div>
    );
  }

  // 文档编辑状态
  return (
    <div className="border-gray-200 overflow-hidden flex flex-col h-full w-full">
        {/* 文档标题 */}
        <div className="bg-blue-50 px-4 py-2 border-b border-gray-200 text-sm text-gray-700">
            <input
            type="text"
            value={documentTitle}
            onChange={handleTitleChange}
            className="w-full text-lg font-bold border-none outline-none"
            placeholder="无标题文档"
            />
        </div>
        {/* Markdown编辑器区域 */}
        <textarea
            value={documentContent}
            onChange={handleContentChange}
            className="flex-1 p-4 font-mono text-base resize-none focus:outline-none"
            placeholder="在此输入Markdown内容..."
            ref={textAreaRef}
        />
        {/* 保存按钮 */}
        <div className="bg-blue-50 px-4 py-2 border-t border-gray-200 text-sm text-gray-500 flex justify-between">
            <button
            type="button"
            className="bg-red-500 text-white px-4 py-2 rounded-md"
            onClick={handleDelete}
            >
            删除
            </button>
            <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={handleSave}
            disabled={!isModified}
            >
            保存
            </button>
        </div>
    </div>
  );
};

// 默认导出以便在其他地方使用
export default MaterialDocContent;