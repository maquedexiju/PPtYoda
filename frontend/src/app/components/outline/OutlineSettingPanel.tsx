import React, { useState, useEffect } from 'react';
import { OutlineTask } from './TaskItem'
import axios from 'axios';
import { getCookie } from '@/lib/cookies';

interface OutlineSettingPanelProps {
  outline: OutlineTask;
  onClose: (changed: boolean, outline?: OutlineTask) => void;
}

const P_TYPE_DISPLAY = {
  'content': '创作页',
  'template': '预置页',
//   'section': '预置章节',
};

export const OutlineSettingPanel: React.FC<OutlineSettingPanelProps> = ({ outline, onClose }) => {
  const [selectedType, setSelectedType] = useState<string>(outline.p_type || 'content');
  const [initialType, setInitialType] = useState<string>(outline.p_type || 'content');
  const [changed, setChanged] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setChanged(selectedType !== initialType);
  }, [selectedType, initialType]);

  const handleConfirm = async () => {
    if (!changed) {
      onClose(false);
      return;
    }

    onClose(true, {
      ...outline,
      p_type: selectedType,
    });

    // setIsLoading(true);
    // const csrfToken = getCookie('csrftoken');
    // try {
    //   const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/slide/${outline.id}/update/`, {
    //     p_type: selectedType,
    //   }, {
    //     headers: {
    //       'X-CSRFToken': csrfToken
    //     },
    //     withCredentials: true
    //   });
    //   if (response.data) {
    //     const apiResponse = response.data as OutlineTask;
    //     if (apiResponse) {
    //         onClose(true, apiResponse);
    //     }
    //   }
    // } catch (err) {
    //   console.error('Error updating tasks:', err);
    // }

  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 磨砂背景 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      ></div>

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6">
          {/* 标题 */}
          <h2 className="text-lg font-bold text-gray-900 mb-6">页面设置</h2>

          {/* 页面类型选择 */}
          <div className="mb-8">
            <p className="font-medium text-gray-700 mb-3">页面类型</p>
            <div className="space-x-3 flex">
              {Object.entries(P_TYPE_DISPLAY).map(([value, label]) => (
                <div key={value} className="flex items-center">
                  <input
                    type="radio"
                    id={`type-${value}`}
                    name="pageType"
                    value={value}
                    checked={selectedType === value}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label
                    htmlFor={`type-${value}`}
                    className="ml-2 block text-sm text-gray-700"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? '保存中...' : '确认'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};