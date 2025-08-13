import React, { useState } from 'react'
import { OutlineTask } from './TaskItem';

interface GenerateOutlineButtonProps {
    project_id: string | number;
    on_outline_generated: (outline: OutlineTask[]) => void;
}

export const GenerateOutlineButton: React.FC<GenerateOutlineButtonProps> = ({
    project_id,
    on_outline_generated,
}) => {

    // 是否在创建中
    const [isLoading, setIsLoading] = useState(false);
    // 当前步骤信息
    const [currentStep, setCurrentStep] = useState('');
    // 是否出现错误
    const [isError, setIsError] = useState(false);
    // 错误信息
    const [errorMessage, setErrorMessage] = useState('');

    // 网络请求生成大纲
    const queryOutlineGenerate = async () => {
        setIsLoading(true);
        setIsError(false);
        
        // 和 wsUrl 建立连接
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL + '/projects/generate_outline/';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('连接成功');

            ws.send(JSON.stringify({
                'project_id': project_id,
            }));
        };
        ws.onmessage = (event) => {
            console.log('收到消息', event.data);
            const data = JSON.parse(event.data);

            // 如果是错误
            if (data.status === 'error') {
                setIsError(true);
                setErrorMessage(data.message);
                setIsLoading(false);
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
                if (data.tasks_content) {
                    on_outline_generated(data.tasks_content as OutlineTask[]);
                }
                
            }

        };
        ws.onclose = (event) => {
            console.log('连接关闭', event);
        };

    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-base font-bold text-gray-700 mb-2">大纲创建中</p>
                    {/* loading 动图 */}
                    <div className="mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="text-sm text-gray-500">{currentStep}</p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-base font-bold text-gray-700 mb-2">大纲创建失败</p>
                    <p className="text-sm text-gray-500">{errorMessage}</p>
                    <button
                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm mb-3"
                    onClick={queryOutlineGenerate}
                    >
                    重新创建
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
                <p className="text-base font-bold text-gray-700 mb-2">尚未生成大纲</p>
                <button
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm mb-3"
                onClick={queryOutlineGenerate}
                >
                创建大纲
                </button>
            </div>
        </div>
    );
};