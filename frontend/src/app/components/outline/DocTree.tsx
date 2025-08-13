import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BaseTask } from '@/lib/task';
import { getCookie } from '@/lib/cookies';

// 继承 Task
export interface DocTree extends BaseTask {
  docs?: {
    id: number | string;
    name: string;
  }[]
}

export interface Document {
  id: number | string;
  name: string;
  type: 'manual' | 'auto';
}

interface DocTreeModalProps {
  projectId: number | string;
  outlineId: number | string;
  docTree: DocTree[];
  documents: Document[];
  isOpen: boolean;
  onClose: (documents: Document[]) => void;
}


const DocNode: React.FC<{
  id: number | string;
  name: string;
  status: 'manual' | 'auto' | 'empty';
  onStatuschange: (id: number | string, status: 'manual' | 'auto' | 'empty') => void;
}> = ({ id, name, status: initialStatus, onStatuschange }) => {

  const [status, setStatus] = useState(initialStatus);

  const handleNodeClick = () => {
    var newStatus: 'manual' | 'auto' | 'empty';
    if (status === 'empty') {
      newStatus = 'manual'
    } else {
      newStatus = 'empty'
    }
    setStatus(newStatus)
    onStatuschange(id, newStatus);
  }

  return (
    <div 
      className="flex cursor-pointer hover:bg-gray-50"
      onClick={handleNodeClick}
    >
      {/* 图标 */}
      <div className="flex items-center space-x-2 hover:bg-gray-50 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20M4 2h16M4 22h16M16 2v6h6M8 12h8M8 16h6" />
        </svg>
      </div>

      {/* 文字 */}
      <div className="grow">
        {name}
      </div>

      {/* 状态显示 */}
      <div className="items-center flex space-x-1">
        {status != 'empty' && (
          <>
          <div className="text-sm">
            {status == 'auto' ? '自动' : '手动'}
          </div>
          <svg fill="" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5567" width="16" height="16">
            <path className="fill-blue-500" d="M512 1024C229.248 1024 0 794.752 0 512S229.248 0 512 0s512 229.248 512 512-229.248 512-512 512z m-114.176-310.954667a53.333333 53.333333 0 0 0 75.434667 0l323.328-323.328a53.333333 53.333333 0 1 0-75.434667-75.434666l-287.914667 283.306666-128.853333-128.853333a53.333333 53.333333 0 1 0-75.434667 75.434667l168.874667 168.874666z" fill="#3D3D3D" p-id="5568"></path>
          </svg>
          </>
        )}
      </div>

    </div>
  )
}

// 递归文档树节点组件
const DocTreeNode: React.FC<{
  node: DocTree;
  documents: Document[];
  // expanded: boolean;
  onToggleExpand: (id: string) => void;
  onAssociationChange: (id: string | number, status: 'manual' | 'auto' | 'empty') => void;
}> = ({ node, documents, onToggleExpand, onAssociationChange }) => {

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <div 
        className={`flex items-center space-x-2 hover:bg-gray-50 p-1 ${node.sub_tasks && node.sub_tasks.length > 0 ? 'cursor-pointer' : ''}`}
        onClick={()=>{setIsExpanded(!isExpanded)}}
      >
        {/* 缩进 */}
        {/* {level > 0 && (
          <div className={`w-[${level * 12}px] h-2 rounded-full bg-gray-300`}></div>
        )} */}
        {/* 图标 */}
        <div>
          {/* svg 表示文档 */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            <path d="M4 10h16" />
          </svg>
        </div>
        {/* 节点文本和状态标签 */}
        <div className="flex items-center flex-1 grow">
            {node.name}
        </div>

        {/* 展开/收起按钮 */}
        {node.sub_tasks && node.sub_tasks.length > 0 ? (
          <button
            onClick={() => onToggleExpand(node.id.toString())}
            className="mr-2 text-gray-500"
            aria-label={isExpanded ? "收起" : "展开"}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        ) : (
          <button
            className="mr-2 text-gray-500"
          >
            -
          </button>
        )}
      </div>

      {/* 子节点 */}
      {isExpanded && ((node.sub_tasks && node.sub_tasks.length > 0) || (node.docs && node.docs.length > 0)) && (
        <div className="ml-6 mt-1 border-l-2 border-gray-200 pl-2">
          {/* 如果有 docs */}
          {node.docs?.map(doc => (
            <DocNode
              key={doc.id}
              id={doc.id}
              name={doc.name}
              // status 取决于：如果当前文件的 id 在 documents 的 id 中，则取 type 的值，否则为 empty
              status={documents.find(d => d.id === doc.id)?.type || 'empty'}
              onStatuschange={onAssociationChange}
            />
          ))}
          
          {node.sub_tasks?.map(child => (
            <DocTreeNode
              key={child.id}
              node={child}
              documents={documents}
              // level={level + 1}
              // expanded={true} // 默认全部展开
              onToggleExpand={onToggleExpand}
              onAssociationChange={onAssociationChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 主模态框组件
export const DocTreeModal: React.FC<DocTreeModalProps> = ({
  projectId,
  outlineId,
  docTree,
  documents: initialDocuments,
  isOpen,
  onClose,
}) => {

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [isGeneratingRelations, setIsGeneratingRelations] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isGeneratingRelationsError, setIsGeneratingRelationsError] = useState<boolean>(false);

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  // 处理关联变更
  const handleAssociationChange = async (
    id: string | number,
    status: 'manual' | 'auto' | 'empty',
  ) => {
    const csrfToken = getCookie('csrftoken')
    if (status === 'empty') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${outlineId}/delete_doc_relation/`
      axios.post(apiUrl, {
        doc_id: id,
      }, {
        headers: {
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true
      }).then((res) => {
        console.log(res);
        setDocuments(documents.filter(doc => doc.id !== id))
      })
    } else {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${outlineId}/create_doc_relation/`
      axios.post(apiUrl, {
        doc_id: id,
      }, {
        headers: {
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true
      }).then((res) => {
        console.log(res);
        const doc = (res.data as {doc?: Document})?.doc
        if (doc) {
          setDocuments([...documents, doc])
        }
      })
    }
  };

  // 自动关联按钮点击处理
  const handleAutoAssociate = async () => {

    setIsGeneratingRelations(true);
    setCurrentStep('');

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL + '/slide/auto_doc_relations/';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('连接成功');

        ws.send(JSON.stringify({
            'ppt_page_id': outlineId,
        }));
    };
    ws.onmessage = (event) => {
        console.log('收到消息', event.data);
        const data = JSON.parse(event.data);

        // 如果是错误
        if (data.status === 'error') {
            setIsGeneratingRelationsError(true);
            setCurrentStep(data.message);
            return;
        }

        // 如果是 doing
        if (data.status === 'doing') {
            setCurrentStep(data.desc);
            return;
        }

        // 如果是 success
        if (data.status === 'success') {
            setIsLoading(false);
            // 如果有 tasks_content
            if (data.related_files) {
              setDocuments(data.related_files);
              setIsGeneratingRelations(false);
            }
            
        }

    };
    ws.onclose = (event) => {
        console.log('连接关闭', event);
        setIsGeneratingRelations(false);
    };
  };

  // 如果模态框未打开，不渲染
  if (!isOpen) return null;

  if (isGeneratingRelations) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 磨砂背景 */}
      <div
        className="absolute inset-0 bg-black/50  backdrop-blur-sm"
        onClick={() => onClose(documents)}
      ></div>

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
                <p className="text-base font-bold text-gray-700 mb-2">正在创建文件关联</p>
                {/* loading 动图 */}
                <div className="mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-sm text-gray-500">{currentStep}</p>
                {isGeneratingRelationsError && (
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
                    onClick={handleAutoAssociate}
                  >
                    重新关联
                  </button>
                )}
            </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 磨砂背景 */}
      <div
        className="absolute inset-0 bg-black/50  backdrop-blur-sm"
        onClick={() => onClose(documents)}
      ></div>

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 标题行 */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">文档关联</h3>
          <button
            onClick={handleAutoAssociate}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? '处理中...' : '自动关联'}
          </button>
        </div>

        {/* 文档树主体 */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* 循环 DocTree */}
          {docTree.map(node => (
            <DocTreeNode
              key={node.id}
              node={node}
              documents={documents}
              // level={0}
              onToggleExpand={()=>{}}
              onAssociationChange={handleAssociationChange}
            />
          ))}
        </div>

        {/* 底部关闭按钮 */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={() => onClose(documents)}
            className="px-3 py-1 bg-gray-200 rounded text-gray-800 hover:bg-gray-300 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};