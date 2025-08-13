import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { getCookie } from '@/lib/cookies'

interface Template {
    id: number;
    name: string;
    description: string;
}

export const OutlineSlideData: React.FC<{
    id: number | string;
}> = ({ id }) => {

    const [documentContent, setDocumentContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState('');

    const [templateId, setTemplateId] = useState<number | string | null>(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateList, setTemplateList] = useState<Template[]>([]);
    const [changeTemplateLoading, setChangeTemplateLoading] = useState(false);

    // 获取模板数据
    const fetchSlideData = async () => {
        setIsLoading(true);
        const csrftoken = getCookie('csrftoken');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${id}/get_slide_data/`;
        try {
            const response = await axios.post(apiUrl, {}, 
                {
                    headers: {
                        'X-CSRFToken': csrftoken,
                    },
                    withCredentials: true
                }
            );
            setDocumentContent((response.data as { slide_data: string }).slide_data);
            setTemplateId((response.data as { template_id: string }).template_id);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error('加载数据失败', error);
        }
    }

    // 保存 slide data
    const querySaveSlideData = async () => {
        setIsLoading(true);
        try {
            const csrftoken = getCookie('csrftoken');
            await axios.post(process.env.NEXT_PUBLIC_API_URL + `/slide/${id}/save_slide_data/`, {
                slide_data: documentContent,
            },
            {
                headers: {
                    'X-CSRFToken': csrftoken,
                },
                withCredentials: true
            });
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error('保存失败', error);
        }
    }

    // 生成模板数据
    const queryGenerateSlideData = async () => {
        setIsLoading(true);
        try {
            // 发起 websocket
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL + `/slide/generate_slide_data/`;
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    'ppt_page_id': id,
                }));
            }
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.status === 'doing') {
                    setCurrentStep(data.message);
                    return;
                }
                if (data.status === 'success') {
                    setDocumentContent(data.slide_data);
                    setIsLoading(false);
                    setCurrentStep('');
                }
            };
        } catch (error) {
            setIsLoading(false);
            console.error('生成失败', error);
        }
    }

    // 获取模板列表
    const fetchTemplateList = async () => {
        try {
            const csrftoken = getCookie('csrftoken');
            const response = await axios.post(process.env.NEXT_PUBLIC_API_URL + `/slide/${id}/get_available_slide_templates/`, 
                {},
                {
                    headers: {
                        'X-CSRFToken': csrftoken,
                    },
                    withCredentials: true
                }
            );
            if (response.data.slide_templates) {
                setTemplateList(response.data.slide_templates);
            }
        } catch (error) {
            console.error('获取模板列表失败', error);
        }
    }

    // 更新模板数据
    const updateTemplateId = async (templateId: number | string | null) => {
        setChangeTemplateLoading(true);
        const csrftoken = getCookie('csrftoken');
        const response = await axios.post(process.env.NEXT_PUBLIC_API_URL + `/slide/${id}/change_template/`, {
            template_id: templateId,
        },
        {
            headers: {
                'X-CSRFToken': csrftoken,
            },
            withCredentials: true
        });
        if (response.status === 200) {
            setTemplateId(templateId);
        }
        setChangeTemplateLoading(false);
    }

    // 加载模板数据
    useEffect(() => {
        fetchSlideData();
        fetchTemplateList();
    }, [id]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDocumentContent(e.target.value);
    };

    const handleSave = async () => {
        await querySaveSlideData();
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-base font-bold text-gray-700 mb-2">内容生成中</p>
                    {/* loading 动图 */}
                    <div className="mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="text-sm text-gray-500">{currentStep}</p>
                </div>
            </div>
        )
    }


    return (
        <>
            {/* Markdown编辑器区域 */}
            <textarea
                value={documentContent}
                onChange={handleContentChange}
                className="flex-1 p-4 font-mono text-base resize-none focus:outline-none grow"
                placeholder="在此输入JSON内容..."
            />
            {/* 按钮 */}
            <div className="bg-blue-50 px-4 py-2 border-t border-gray-200 flex justify-between rounded-b items-center relative w-full">
                {/* 左侧切换模板  */}
                <div className='flex items-center grow overflow-hidden'>
                    <span>当前模板：</span>
                    <div className='pl-4 pr-2 py-2 bg-white rounded flex justify-between items-center max-w-[500px] min-w-[200px] cursor-pointer'
                        onClick={() => {
                            fetchTemplateList();
                            setShowTemplateModal(true);
                        }}
                    >
                        <div className='overflow-hidden text-ellipsis whitespace-nowrap'>
                            {templateId ? templateList.find((template) => template.id === templateId)?.name : '自动'}
                        </div>
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                    </div>
                </div>
                {/* 模板列表 */}
                {(showTemplateModal) && (
                    <div className='absolute bottom-0 left-4 bg-white rounded-md shadow-md'>
                        <div className='p-4 font-bold text-gray-700 bg-gray-100'>模板列表</div>
                        <div className='p-4 overflow-y-scroll max-h-[300px] relative'>
                            {changeTemplateLoading && (
                                // loading 动图，盖在上方，覆盖 div 的大小
                                <div className='absolute top-0 left-0 w-full h-full bg-white opacity-80 flex items-center justify-center'>
                                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900'></div>
                                </div>
                            )}
                            <ul>
                                <li className={`py-2 cursor-pointer hover:bg-gray-100 ${templateId === null ? 'bg-gray-100' : ''}`} onClick={() => {
                                    setTemplateId(null);
                                    updateTemplateId(null);
                                    setShowTemplateModal(false);
                                }}>
                                    自动
                                </li>
                                {templateList.map((template) => (
                                    <li key={template.id} className={`py-2 cursor-pointer hover:bg-gray-100 ${templateId === template.id ? 'bg-gray-100' : ''}`} onClick={() => {
                                        setTemplateId(template.id);
                                        updateTemplateId(template.id);
                                        setShowTemplateModal(false);
                                    }}>
                                        {template.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                {/* 按钮区域 */}
                { documentContent ? (
                    <div className='flex gap-x-2'>
                        <button
                            type="button"
                            className="bg-white text-blue-500 border border-blue-500 px-4 py-2 rounded-md"
                            onClick={queryGenerateSlideData}
                        >
                            重新生成
                        </button>
                        <button
                            type="button"
                            className="bg-blue-500 text-white px-4 py-2 rounded-md"
                            onClick={handleSave}
                        >
                            保存
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="bg-blue-500 text-white px-4 py-2 rounded-md"
                        onClick={queryGenerateSlideData}
                    >
                        生成模板数据
                    </button>
                )}
            </div>
        </>  
    )
}