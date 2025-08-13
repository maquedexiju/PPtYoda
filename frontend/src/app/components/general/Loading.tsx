import React, { useState } from 'react';


export const LoadingModal: React.FC<{
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