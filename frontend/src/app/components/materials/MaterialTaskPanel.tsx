import React, { useState, useEffect } from 'react'
import { Task } from '@/app/components/materials/TaskItem';
import { getCookie } from '@/lib/cookies'
import { MaterialDocList } from '@/app/components/materials/MaterialDocList';
import { MaterialDocContent } from '@/app/components/materials/MaterialDocContent';

import axios from 'axios';

interface MaterialTaskPanelProps {
    chosenTask: Task | null;
    breadcrumb: Task[] | undefined;
}

interface FileItem {
  id: string;
  name: string;
  content?: string;
}

interface FileListAPIResponse {
  documents: FileItem[];
}

export const MaterialTaskPanel: React.FC<MaterialTaskPanelProps> = ({ chosenTask, breadcrumb }) => {

    const [fileList, setFileList] = useState<FileItem[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [fileListOutdated, setOutdated] = useState<boolean>(false);

    // const [fileContent, setFileContent] = useState('');

    // 获取 fileList
    // useEffect(() => {
    //     if (chosenTask) {
    //         // 获取 csrftoken
    //         const csrftoken = getCookie('csrftoken');
    //         // axios post
    //         axios.post(process.env.NEXT_PUBLIC_API_URL + '/materials/task/' + chosenTask.id + '/documents/', {
    //             'task_id': chosenTask.id,
    //         }, {
    //             headers: {
    //                 'X-CSRFToken': csrftoken,
    //             },
    //             withCredentials: true
    //         }).then(res => {
    //             const apiResponse = res.data as FileListAPIResponse;
    //             setFileList(apiResponse.documents);
    //         })
            
    //     }
    // }, [chosenTask])

    // 处理文件选择，把 list 中选中的 file 同步给 content
    const handleFileSelect = (file: FileItem | null) => {
        setSelectedFile(file);
    };

    // 处理内容变更，当 content 变更时，更新 list 中选中的 file
    const onContentChange = (file: FileItem | null) => {
        console.log('content change')
        setOutdated(true);
        if (file == null) {
            setSelectedFile(null);
        }
    };
    // 更新完之后，设置状态为 false
    const onRefresh = () => {
        setOutdated(false);
    };

    return (
        <div className="bg-white h-full rounded">
            { chosenTask==null ? (
                <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-700 mb-2">尚未选择任务</p>
                        <p className="text-gray-500 max-w-[200px]">请从左侧任务列表中选择一个素材收集任务以开始工作</p>
                    </div>
                </div>
            ) : (
                <div className='flex flex-col h-full'>
                    {/* 面包屑导航 */}
                    <div className="p-4 border-b border-gray-200">
                        {breadcrumb && breadcrumb.length > 0 ? (
                        <div className="flex items-center text-sm text-gray-600">
                            {breadcrumb.map((file, index) => (
                            <React.Fragment key={file.id}>
                                <span className="hover:text-blue-600 cursor-pointer">{file.name}</span>
                                {index !== breadcrumb.length - 1 && <span className="mx-2">/</span>}
                            </React.Fragment>
                            ))}
                        </div>
                        ) : (
                        <div className="text-sm text-gray-500 italic">未选择任务</div>
                        )}
                    </div>

                    {/* 主内容区 */}
                    <div className="flex overflow-hidden grow">
                        {/* 文件列表 - 左侧 */}
                        <div className="w-[250px] border-r border-gray-200 bg-white p-4 overflow-y-auto h-full">
                            <MaterialDocList
                                chosenTask={chosenTask}
                                onFileSelect={handleFileSelect}
                                outdated={fileListOutdated}
                                onRefresh={onRefresh}
                                // selectedFile={selectedFile}
                            />
                        </div>

                        {/* 文件内容 - 右侧 */}
                        <div className="grow">
                            <MaterialDocContent
                                selectedFile={selectedFile}
                                onContentChange={onContentChange}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}