import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies'

import { FileGeneration } from './FileGeneration';
import { MultimediaGeneration } from './MultimediaGeneration';
import { FinalFile } from './FinalFile';

import { LoadingModal } from '../general/Loading';

export interface PPtGenerateStatus {
    current_stage: 'file_generation' | 'multimedia_processing' | 'final_file' | 'completed';
    intermediate_file: string | null;
    final_file: string | null;
    created_at: string;
    updated_at: string;
}

export const PPTGenerateProgress: React.FC<{
    project_id: string | number;
}> = ({ project_id }) => {
  // 定义步骤顺序与状态对应关系
  const steps = [
    { value: 'file_generation', label: '文件生成' },
    { value: 'multimedia_processing', label: '多媒体处理' },
    { value: 'final_file', label: '最终文件' },
  ];

  const [pptGenerateStatus, setPPtGenerateStatus] = useState<PPtGenerateStatus>({
    current_stage: 'file_generation',
    intermediate_file: null,
    final_file: null,
    created_at: '',
    updated_at: '',
  });

  // 获取状态
  const getPPtGenerateStatus = async () => {

    if (!project_id) {
      return;
    }

    const url = process.env.NEXT_PUBLIC_API_URL + '/projects/' + project_id + '/ppt_generation/status/';
    const response = await axios.post<{
        status: string;
        message: string;
        generation_status?: PPtGenerateStatus;
    }>(url, {}, {
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
        },
        withCredentials: true,
    });
    if (response.data.generation_status) {
        setPPtGenerateStatus(response.data.generation_status);
    }
  }
  useEffect(() => {
    getPPtGenerateStatus();
  }, [project_id]);

  // 设置当前步骤
  const [currentStep, setCurrentStep] = useState(steps[0].value);
  const currentIndex = steps.findIndex(step => step.value === currentStep);

  const changeStep = (step: string) => {
    // 获取 step 的 index
    const index = steps.findIndex(s => s.value === step);
    // 获取 pptGenerateStatus 中 current_stage 的 index
    const currentStageIndex = steps.findIndex(s => s.value === pptGenerateStatus?.current_stage);
    
    // 如果 step 的 index 小于等于 currentStageIndex，才允许切换
    if (index <= currentStageIndex) {
      setCurrentStep(step);
    }
  }

  useEffect(() => {
    setCurrentStep(pptGenerateStatus?.current_stage || steps[0].value);
  }, [pptGenerateStatus]);

  // loading 处理
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTask, setLoadingTask] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [LoadingError, setLoadingError] = useState<boolean>(false);


  return (
    <div className="w-full h-full flex flex-col">
      <LoadingModal
        isOpen={isLoading}
        task={loadingTask}
        status={loadingStatus}
        error={LoadingError}
        onClose={() => {
          setIsLoading(false);
          setLoadingTask('');
          setLoadingStatus('');
          setLoadingError(false);
        }}
      />
      {/* 进度条区域 */}
      <div className="flex items-center justify-center w-full border-b border-gray-200">
        <div className="flex items-start justify-between py-6 min-w-[600px]">
            {steps.map((step, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
                <React.Fragment key={step.value}>

                {/* 连接线（第一个步骤不需要连接线） */}
                {index >  0 && (
                    <div className='flex grow h-10 items-center'>
                        <div className={`flex-grow h-1 mx-2 transition-colors duration-300  rounded ${
                        isActive ? 'bg-blue-500' : 'bg-gray-200'
                        }`} />
                    </div>
                )}

                {/* 步骤节点 */}
                <div 
                    className="flex flex-col items-center relative z-10 cursor-pointer"
                    onClick={() => {
                        changeStep(step.value);
                    }}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                    {index + 1}
                    </div>
                    <span className={`mt-2 text-sm ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                    {step.label}
                    </span>
                </div>
                </React.Fragment>
            );
            })}
        </div>
      </div>

      {/* 主内容区域，根据当前步骤显示不同的组件 */}
      <div className="flex-grow  w-full">
        {currentStep === 'file_generation' && (
          <FileGeneration 
            project_id={project_id} pptGenrationStatus={pptGenerateStatus} onGenerated={() => getPPtGenerateStatus()} 
            onLoading={({ isLoading, task, status, error }) => {
              setIsLoading(isLoading);
              setLoadingTask(task);
              setLoadingStatus(status);
              setLoadingError(error);
            }}
          />
        )}
        {currentStep === 'multimedia_processing' && (
          <MultimediaGeneration 
            project_id={project_id} pptGenrationStatus={pptGenerateStatus} onGenerated={() => getPPtGenerateStatus()} 
            onLoading={({ isLoading, task, status, error }) => {
              setIsLoading(isLoading);
              setLoadingTask(task);
              setLoadingStatus(status);
              setLoadingError(error);
            }}
          />
        )}
        {currentStep === 'final_file' && (
          <FinalFile 
            project_id={project_id} pptGenrationStatus={pptGenerateStatus} onGenerated={() => getPPtGenerateStatus()} 
            onLoading={({ isLoading, task, status, error }) => {
              setIsLoading(isLoading);
              setLoadingTask(task);
              setLoadingStatus(status);
              setLoadingError(error);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PPTGenerateProgress;