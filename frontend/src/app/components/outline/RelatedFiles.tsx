import React, { useState, useEffect } from 'react'
import axios from 'axios'

import { getCookie } from '@/lib/cookies'

import { OutlineTask } from './TaskItem'
import { DocTree, Document, DocTreeModal } from './DocTree'
import { Task } from '@/app/components/materials/TaskItem'

interface RelatedFilesProps {
    outline: OutlineTask;
    project_id: string | number;
}


interface DocumentBlockProps {
    document: Document;
    onDelete: (id: number | string) => void;
}

const DocumentBlock: React.FC<DocumentBlockProps> = ({ 
    document,
    onDelete,
}) => {

    return (
        <div className="flex items-center p-2 bg-blue-50 rounded">
            {/* 最宽不超过 200px，文字超出的部分显示 ... */}
            <div className="max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap">
                {document.name}
            </div>
            
            {/* SVG垃圾桶删除按钮 */}
            <button 
                onClick={() => onDelete(document.id)} 
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="删除文档"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    )
}

export const RelatedFiles: React.FC<RelatedFilesProps> = ({ outline, project_id }) => {

    const [relatedFiles, setRelatedFiles] = useState<Document[]>([]);
    const [fileTree, setFileTree] = useState<DocTree[]>([]);
    const [docTreeModalOpen, setDocTreeModalOpen] = useState<boolean>(false);
    
    // 获取关联文件
    useEffect(() => {
        if (!outline.id) {
            return;
        }
        const csrftoken = getCookie('csrftoken');
        if (!csrftoken) {
            return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${outline.id}/related_docs/`;
        axios.post(apiUrl, {}, {
            headers: {
                'X-CSRFToken': csrftoken,
            },
            withCredentials: true,
        }).then((response) => {
            setRelatedFiles((response.data as { docs: Document[] })?.docs || []);
        });
    }, [outline]);

    // 获取文档树
        useEffect(() => {
            const csrfToken = getCookie('csrftoken');
            if (!csrfToken) {
                return;
            }
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/projects/${project_id}/material_tasks/generate_doc_tree/`
            axios.post(apiUrl, {}, {
            headers: {
            'X-CSRFToken': csrfToken
            },
            withCredentials: true
        }).then((response) => {
                setFileTree((response.data as { tasks_content: DocTree[] })?.tasks_content || []);
            });
    }, []);

    const unlinkFile = async (id: number | string) => {
        // 解除关联
        const csrftoken = getCookie('csrftoken');
        if (!csrftoken) {
            return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${outline.id}/delete_doc_relation/`;
        axios.post(apiUrl, {
            doc_id: id,
        }, {
            headers: {
                'X-CSRFToken': csrftoken,
            },
            withCredentials: true,
        }).then((response) => {
            // setRelatedFiles((response.data as { docs: Document[] })?.docs || []);
            setRelatedFiles(relatedFiles.filter((file) => file.id !== id));
        });
    }

    const linkFile = async (id: number | string) => {
        // 关联文件
        const csrftoken = getCookie('csrftoken');
        if (!csrftoken) {
            return;
        }
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${outline.id}/add_doc_relation/`;
        axios.post(apiUrl, {
            doc_id: id,
        }, {
            headers: {
                'X-CSRFToken': csrftoken,
            },
            withCredentials: true,
        }).then((response) => {
            // setRelatedFiles((response.data as { docs: Document[] })?.docs || []);
            const file = (response.data as { doc: Document })?.doc;
            setRelatedFiles([...relatedFiles, file]);
        });
    }
    
    if (relatedFiles.length == 0) {
        // 返回一整个蓝色的虚线框，浅蓝色底纹，宽度占满，居中文字“新增关联文档”，点击打开 文档树 modal
        return (
            <div className="w-full h-[200px] flex flex-col gap-y-2">
                {/* <div className="text-lg">关联文档</div> */}
                <div 
                    className="text-center text-blue-500 border border-blue-500 border-dashed bg-blue-100 rounded-md p-2 grow  cursor-pointer"
                    onClick={() => setDocTreeModalOpen(true)}
                >
                    {/* 新增关联文档 上下居中 */}
                    <div className="flex items-center justify-center h-full">新增关联文档</div>
                </div>

                <DocTreeModal
                    projectId={project_id}
                    docTree={fileTree}
                    documents={relatedFiles}
                    isOpen={docTreeModalOpen}
                    onClose={(documents) => {
                        setDocTreeModalOpen(false);
                        setRelatedFiles(documents);
                    }}
                    outlineId={outline.id}
            />

            </div>
        )
    }

    return (
        <div className="w-full rounded-md border border-gray-300 shadow-sm">
            <div className="flex space-x-2 mb-2 bg-gray-100 rounded-t p-4">
                <div className="text-lg">关联文档</div>
                {/* 点击按钮，打开 DocTreeModal */}
                <button 
                    className="bg-blue-500 text-white rounded text-sm py-1 px-2 cursor-pointer"
                    onClick={() => setDocTreeModalOpen(true)}>管理关联文档</button>
            </div>

            <DocTreeModal
                projectId={project_id}
                docTree={fileTree}
                documents={relatedFiles}
                isOpen={docTreeModalOpen}
                onClose={(documents) => {
                    setDocTreeModalOpen(false);
                    setRelatedFiles(documents);
                }}
                outlineId={outline.id}
            />

            <div className="flex flex-wrap gap-2 p-4">
                {relatedFiles.map((file) => (
                    <DocumentBlock
                        key={file.id}
                        document={file}
                        onDelete={unlinkFile}
                    />
                ))}
            </div>
        </div>
    )
}