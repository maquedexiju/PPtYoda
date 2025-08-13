import React, { useState, useEffect } from 'react';
import { PPtGenerateStatus } from './PPTGenerateProgress';

export const FileGeneration: React.FC<{
    project_id: string | number;
    pptGenrationStatus: PPtGenerateStatus;
    onGenerated: () => void;
    onLoading: ({ isLoading, task, status, error }: { isLoading: boolean; task: string; status: string; error: boolean }) => void;
}> = ({ 
    project_id, pptGenrationStatus, onGenerated, onLoading
}) => {
    

    const generatePPt = async () => {

        onLoading({ isLoading: true, task: '生成PPT', status: '正在生成', error: false });
        const url = process.env.NEXT_PUBLIC_WS_URL + '/projects/generate_ppt/';
        const ws = new WebSocket(url);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                'project_id': project_id
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
                link.download = file_name + '.pptx';
                link.click();
                URL.revokeObjectURL(url);

                onLoading({ isLoading: false, task: '', status: '', error: false });
                onGenerated();
            } else if (data.status === 'error') {
                onLoading({ isLoading: true, task: '生成PPT', status: data.message, error: true });
            } else if (data.status === 'doing') {
                onLoading({ isLoading: true, task: '生成PPT', status: data.message, error: false });
            }
        }
    }

    // 如果没有 intermediate_file 返回大按钮
    if (!pptGenrationStatus.intermediate_file) {
        return (
            <div className="w-full h-full flex flex-col p-12">
                {/* <div className="text-lg">关联文档</div> */}
                <div 
                    className="text-center text-blue-500 border border-blue-500 border-dashed bg-blue-100 rounded-md p-2 grow  cursor-pointer"
                    onClick={() => generatePPt()}
                >
                    {/* 创建 PPt 上下居中 */}
                    <div className="flex items-center justify-center h-full">生成PPT</div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full flex flex-col p-12 justify-center items-center">
            <div className="rounded-lg p-8 max-w-lg w-full text-center shadow bg-white">
                {/* 提示文字 */}
                <div className="text-center mb-6 font-bold">
                    <p>

                        当您的页面内容发生调整后，可以重新生成 PPt
                    </p>
                    <p>
                        重新生成后，旧的 PPt 会被覆盖。
                    </p>
                </div>
                {/* 重新创建按钮 */}
                <div>
                    <button 
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
                        onClick={() => generatePPt()}
                    >
                        重新创建
                    </button>
                </div>
            </div>
            
        </div>
    );
}