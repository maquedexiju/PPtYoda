import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { getCookie } from '@/lib/cookies'

export const OutlineFullText: React.FC<{
    id: number | string;
}> = ({ id }) => {

    const [documentContent, setDocumentContent] = useState('');
    const documentContentRef = useRef(documentContent);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [isModified, setIsModified] = useState(false);
    const isModifiedRef = useRef(isModified);

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
                querySaveFullText().then(() => {
                    setIsModified(false);
                });
            }
        }
    }

    // 获取全文
    const fetchFullText = async () => {
        if (!id) {
            return;
        }
        setIsLoading(true);
        const csrftoken = getCookie('csrftoken');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + `/slide/${id}/get_full_text/`;
        try {
            const response = await axios.post(apiUrl, {}, 
                {
                    headers: {
                        'X-CSRFToken': csrftoken,
                    },
                    withCredentials: true
                }
            );
            setDocumentContent((response.data as { full_text: string }).full_text);
            setIsLoading(false);
            setIsModified(false);
        } catch (error) {
            setIsLoading(false);
            console.error('加载大纲失败', error);
        }
    }

    // 保存全文
    const querySaveFullText = async () => {
        setIsLoading(true);
        try {
            const csrftoken = getCookie('csrftoken');
            await axios.post(process.env.NEXT_PUBLIC_API_URL + `/slide/${idRef.current}/save_full_text/`, {
                full_text: documentContentRef.current,
            },
            {
                headers: {
                    'X-CSRFToken': csrftoken,
                },
                withCredentials: true
            });
            setIsLoading(false);
            setIsModified(false);
        } catch (error) {
            setIsLoading(false);
            console.error('保存失败', error);
        }
    }

    // 生成 full text
    const queryGenerateFullText = async () => {
        setIsLoading(true);
        try {
            // 发起 websocket
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL + `/slide/generate_full_text/`;
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    'ppt_page_id': id,
                }));
            }
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.status === 'doing') {
                    setCurrentStep(data.desc);
                    return;
                }
                if (data.status === 'success') {
                    setDocumentContent(data.full_text);
                    setIsLoading(false);
                    setCurrentStep('');
                }
            };
        } catch (error) {
            setIsLoading(false);
            console.error('生成失败', error);
        }
    }

    // 打开 AI 助手
    const openAIHelper = () => {
        const url = process.env.NEXT_PUBLIC_API_URL + `/slide/open_ai_helper/`;
        const ws = new WebSocket(url);
        ws.onopen = () => {
        setIsLoading(true);
        setCurrentStep('开启 AI 助手');
        ws.send(JSON.stringify({
            'ppt_page_id': id,
        }));
        }
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data['status'] === 'success') {
            setIsLoading(false);
            setCurrentStep('');
            // alert('AI 助手已开启');
            } else if (data['status'] === 'error') {
            setCurrentStep('AI 助手开启失败');
            setIsLoading(false);
            } else if (data['status'] === 'doing') {
            setCurrentStep(data['message']);
            setIsLoading(true);
            }
        }
    }

    // 加载大纲全文，但是需要判断是否有修改
    const idRef = useRef(id);
    useEffect(() => {
        remindSave();
        fetchFullText();
        idRef.current = id;
    }, [id]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDocumentContent(e.target.value);
        documentContentRef.current = e.target.value;
        setIsModified(true);
    };

    const handleSave = async () => {
        await querySaveFullText();
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
                placeholder="在此输入Markdown内容..."
            />
            {/* 按钮 */}
            <div className="bg-blue-50 px-4 py-2 border-t border-gray-200 text-sm text-gray-500 flex justify-end rounded-b gap-x-2">
                <button
                    type="button"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md"
                    onClick={openAIHelper}
                >
                    打开 AI 助手
                </button>
                { documentContent ? (
                    <button
                        type="button"
                        className="bg-white border border-blue-500 text-blue-500 px-4 py-2 rounded-md disabled:opacity-50"
                        onClick={handleSave}
                        disabled={!isModified}
                    >
                        保存
                    </button>
                ) : (
                    <button
                        type="button"
                        className="bg-white border border-blue-500 text-blue-500 px-4 py-2 rounded-md"
                        onClick={queryGenerateFullText}
                    >
                        生成内容
                    </button>
                )}
            </div>
        </>  
    )
}