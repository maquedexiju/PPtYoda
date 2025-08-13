import React, { useState } from 'react'

const LoadingModal: React.FC<{
    isOpen: boolean;
    task: string;
    status: string;
    error: boolean;
    onClose: () => void;
}> = ({ isOpen, task, status, error, onClose }) => {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 磨砂背景 */}
            <div
                className="absolute inset-0 bg-black/50  backdrop-blur-sm"
            ></div>

            {/* 模态框内容 */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="h-full flex items-center justify-center p-8">
                    <div className="text-center">
                        <p className="text-base font-bold text-gray-700 mb-2">{task}</p>
                        {/* loading 动图 */}
                        <div className={`mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 ${error ? 'hidden' : ''}`}></div>
                        <p className="text-sm text-gray-500">{status}</p>
                        {error && (
                        <button
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-300"
                            onClick={onClose}
                        >
                            关闭
                        </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
  )
}



export const OutlineBatchOperations: React.FC<{
    project_id: number | string;
}> = ({ project_id }) => {

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingTask, setLoadingTask] = useState<string>('');
    const [loadingStatus, setLoadingStatus] = useState<string>('');
    const [LoadingError, setLoadingError] = useState<boolean>(false);

    const handleAutoAssociate = async () => {

        if (!window.confirm('关联文件不会变动手动关联的记录，是否继续？')) {
            return;
        }
        setIsLoading(true);
        setLoadingTask('正在创建文件关联');
        setLoadingStatus('');
        setLoadingError(false);

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL + `/projects/auto_doc_relations/`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                project_id: project_id,
            }));
        }
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'doing') {
                setLoadingStatus(data.message);
            } else if (data.status === 'success') {
                setLoadingStatus(data.message);
                setIsLoading(false);
            } else if (data.status === 'error') {
                setLoadingStatus(data.message);
                setLoadingError(true);
            }
        }

    }

    const handleGenerateFullText = async () => {
        if (!window.confirm('生成后将覆盖所有现成的全文，是否继续？')) {
            return;
        }
        setIsLoading(true);
        setLoadingTask('正在生成全文');
        setLoadingStatus('');
        setLoadingError(false);

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL + `/projects/generate_full_text/`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                project_id: project_id,
            }));
        }
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'doing') {
                setLoadingStatus(data.message);
            } else if (data.status === 'success') {
                setLoadingStatus(data.message);
                setIsLoading(false);
            } else if (data.status === 'error') {
                setLoadingStatus(data.message);
                setLoadingError(true);
            }
        }
    }

    const handleGenerateSlideData = async () => {
        if (!window.confirm('生成后将覆盖所有现成的幻灯片数据，是否继续？')) {
            return;
        }
        setIsLoading(true);
        setLoadingTask('正在生成幻灯片数据');
        setLoadingStatus('');
        setLoadingError(false);

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL + `/projects/generate_slide_data/`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                project_id: project_id,
            }));
        }
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'doing') {
                setLoadingStatus(data.message);
            } else if (data.status === 'success') {
                setLoadingStatus(data.message);
                setIsLoading(false);
            } else if (data.status === 'error') {
                setLoadingStatus(data.message);
                setLoadingError(true);
            }
        }
    }

    return (
        <div className='rounded flex flex-col space-y-2 p-4 border-t border-gray-200'>
            <h2 className="text-lg font-bold mb-3">批量操作</h2>

            <div className='w-full'>
                <button
                    className='bg-blue-500 w-full rounded p-2 text-white text-sm cursor-pointer'
                    onClick={handleAutoAssociate}
                >关联文件</button>
            </div>
            <div className='w-full'>
                <button
                    className='bg-blue-500 w-full rounded p-2 text-white text-sm cursor-pointer'
                    onClick={handleGenerateFullText}
                >生成全文</button>
            </div>
            <div className='w-full'>
                <button
                    className='bg-blue-500 w-full rounded p-2 text-white text-sm cursor-pointer'
                    onClick={handleGenerateSlideData}
                >生成幻灯片数据</button>
            </div>

            <LoadingModal
                isOpen={isLoading}
                task={loadingTask}
                status={loadingStatus}
                error={LoadingError}
                onClose={() => setIsLoading(false)}
            />
            
        </div>
    )
}