import React, { useState, useEffect } from 'react';
import { PPtGenerateStatus } from './PPTGenerateProgress';

export const FinalFile: React.FC<{
    project_id: string | number;
    pptGenrationStatus: PPtGenerateStatus;
    onGenerated: () => void;
    onLoading: ({ isLoading, task, status, error }: { isLoading: boolean; task: string; status: string; error: boolean }) => void;
}> = ({ 
    project_id, pptGenrationStatus, onGenerated, onLoading
}) => {
    
    const downloadFinalFile = async () => {
        onLoading({ isLoading: true, task: '下载最终文件', status: '处理中', error: false });
        const url = process.env.NEXT_PUBLIC_WS_URL + '/projects/download_final_ppt/';
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
                    <p className="font-bold mb-6">材料已生成</p>
                    <div className="flex justify-center gap-4">
                        <button 
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
                            onClick={downloadFinalFile}
                        >
                            重新下载
                        </button>
                    </div>
            </div>
        </div>
    );
}