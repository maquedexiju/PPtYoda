import React, { useState, useEffect } from 'react';
import { PPtGenerateStatus } from './PPTGenerateProgress';

export const MultimediaGeneration: React.FC<{
    project_id: string | number;
    pptGenrationStatus: PPtGenerateStatus;
    onGenerated: () => void;
    onLoading: ({ isLoading, task, status, error }: { isLoading: boolean; task: string; status: string; error: boolean }) => void;
}> = ({ 
    project_id, pptGenrationStatus, onGenerated, onLoading
}) => {
    const [showUnsatisfiedInstructions, setShowUnsatisfiedInstructions] = useState(false);
    
    const handleMultimedia = async (base64: string) => {

        onLoading({ isLoading: true, task: '处理多媒体', status: '加载文件', error: false });
        const url = process.env.NEXT_PUBLIC_WS_URL + '/projects/multimedia_processing/';
        const ws = new WebSocket(url);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                'project_id': project_id,
                'file': base64,
            }));
        }
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'success') {
                // 获取 file 和 file_name 字段信息，生成 file_name.pptx，并下载
                const fileB64 = data.file;
                const file_name = data.file_name;
                // 解码 base64 字符串
                const file = atob(fileB64);
                // 步骤3：将二进制字符串转为 Uint8Array（纯二进制数组）
                const len = file.length;
                const uint8Arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    uint8Arr[i] = file.charCodeAt(i);
                }
                // 步骤4：用 Uint8Array 创建 Blob
                const blob = new Blob([uint8Arr], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = file_name;// + '.pptx';
                link.click();
                URL.revokeObjectURL(url);
                
                onLoading({ isLoading: false, task: '', status: '', error: false });
                onGenerated();
            } else if (data.status === 'error') {
                onLoading({ isLoading: true, task: '处理多媒体', status: data.message, error: true });
            } else if (data.status === 'doing') {
                onLoading({ isLoading: true, task: '处理多媒体', status: data.message, error: false });
            }
        }
    }

    const regenerateMultimedia = async () => {
        // 弹出文件选择框，只能选择 pptx 类型的文件
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pptx';
        input.click();
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                onLoading({ isLoading: true, task: '处理多媒体', status: '正在处理', error: false });
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    handleMultimedia(base64);
                    setShowUnsatisfiedInstructions(false);
                }
            }
        }   
    }

    const handleSatisfaction = async () => {
        onLoading({ isLoading: true, task: '生成最终文件', status: '处理中', error: false });
        const url = process.env.NEXT_PUBLIC_WS_URL + '/projects/generate_final_ppt/';
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
            ws.send(JSON.stringify({
                'project_id': project_id
            }));
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'success') {
                onLoading({ isLoading: true, task: '生成最终文件', status: '准备下载文件', error: false });

                // 获取 file 和 file_name 字段信息，生成 file_name.pptx，并下载
                const fileB64 = data.file;
                const file_name = data.file_name;
                // 解码 base64 字符串
                const file = atob(fileB64);
                // 步骤3：将二进制字符串转为 Uint8Array（纯二进制数组）
                const len = file.length;
                const uint8Arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    uint8Arr[i] = file.charCodeAt(i);
                }
                // 步骤4：用 Uint8Array 创建 Blob
                const blob = new Blob([uint8Arr], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = file_name + '.pptx';
                link.click();
                URL.revokeObjectURL(url);
                
                onLoading({ isLoading: false, task: '', status: '', error: false });
                onGenerated();
            } else if (data.status === 'error') {
                onLoading({ isLoading: true, task: '生成最终文件', status: data.message, error: true });
            }
        };
        
        ws.onerror = () => {
            onLoading({ isLoading: true, task: '生成最终文件', status: '连接错误', error: true });
        };
    };

    return (
        <div className="w-full h-full flex flex-col p-12 justify-center items-center">
            <div className="rounded-lg p-8 max-w-lg w-full text-center shadow bg-white">
                { !showUnsatisfiedInstructions && (
                <>
                    <p className="font-bold">请查看下载的 PPt 文件，</p>
                    <p className="font-bold mb-6">仔细检查其中的图片等素材是否满意？</p>
                    <div className="flex justify-center gap-4">
                        <button 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
                            onClick={handleSatisfaction}
                        >
                            满意
                        </button>
                        <button 
                            className="border-blue-500 text-blue-500 hover:bg-blue-100 px-6 py-2 rounded-md transition-colors"
                            onClick={() => setShowUnsatisfiedInstructions(true)}
                        >
                            不满意
                        </button>
                    </div>
                </>
                )}
                
                {showUnsatisfiedInstructions && (
                    <div className="mt-6 text-left text-sm text-gray-700 space-y-4">
                        <p className="font-bold">对于有问题的图片，你需要：</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>删除图片编号后的 “-g”</li>
                            <li>在页面下方的备注中，调整对应图片生成的提示词（由 @img 和 @endimg 包裹）</li>
                            <li>您也可以选择将提示词复制出来，自行生成图片，并粘贴到 PPt 中</li>
                            <li>保存修改</li>
                        </ol>
                        <p className="font-bold">完成后，点击下方的“重新生成”，选择刚刚保存的 PPt，后台将自动处理。</p>
                        
                        <div className="mt-6 text-center">
                            <button 
                                className="text-blue-500 border border-blue-500 bg-blue-100 rounded-md p-2 px-4 hover:bg-blue-200 transition-colors"
                                onClick={regenerateMultimedia}
                            >
                                重新生成
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}