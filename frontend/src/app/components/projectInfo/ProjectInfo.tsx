import React, { useState, useRef, useEffect } from 'react';

import { Task } from '@/app/components/materials/TaskItem';
import { OutlineTask } from '@/app/components/outline/TaskItem';
import { PPtTemplate } from '@/app/components/pptTemplate/PPtTemplate';
import { KnowledgeBase } from '@/app/components/knowledgeBase/KnowlegeBase';

export interface Project {
    id: number;
    name: string;
    theme: string;
    audience: string;
    place: string;
    duration: number;
    target: string;
    created_at: string;
    updated_at: string;
    material_tasks: Task[];
    outline: OutlineTask[];
    template: PPtTemplate;
    knowledge_base?: KnowledgeBase | null;
    stage: 'material' | 'outline' | 'ppt';
}

export const ProjectInfo: React.FC<{ project: Project }> = ({ project }) => {
    return (
        <div className="space-y-2">
            <p><span className="font-bold">主题:</span> {project.theme}</p>
            <p><span className="font-bold">受众:</span> {project.audience}</p>
            <p><span className="font-bold">场合:</span> {project.place}</p>
            <p><span className="font-bold">时长:</span> {project.duration} 分钟</p>
            <p><span className="font-bold">目标:</span> {project.target}</p>
            <p><span className="font-bold">创建时间:</span> {project.created_at}</p>
            <p><span className="font-bold">更新时间:</span> {project.updated_at}</p>
            <p><span className="font-bold">模板:</span> {project.template.name}</p>
            {project.knowledge_base && (
                <p><span className="font-bold">知识库:</span> {project.knowledge_base.name}</p>
            )}
        </div>
    )
}