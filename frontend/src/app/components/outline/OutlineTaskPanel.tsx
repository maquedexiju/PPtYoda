import React, { useState, useEffect } from 'react'
import { OutlineTask } from './TaskItem'
import { RelatedFiles } from './RelatedFiles'
import { OutlineContent } from './OutlineContent'
import { OutlineSettingPanel } from './OutlineSettingPanel'
import { TemplateOutlineContent } from './TemplateOutlineContent'
import { Project } from '@/app/components/projectInfo/ProjectInfo';

interface OutlineTaskPanelProps {
    outline: OutlineTask | null;
    breadcrumb: OutlineTask[] | undefined;
    project: Project;
    onOutlineEdit: (outline: OutlineTask) => void;
}

export const OutlineTaskPanel: React.FC<OutlineTaskPanelProps> = ({ outline: initialOutline, breadcrumb, project, onOutlineEdit }) => {

    const P_TYPE_DISPLAY = {
        'content': '创作页',
        'template': '预置页',
        // 'section': '预置章节',
    }

    const [showSettingPanel, setShowSettingPanel] = useState(false);
    const [outline, setOutline] = useState<OutlineTask | null>(initialOutline);

    // 监听 outline 变化
    useEffect(() => {
        setOutline(initialOutline);
    }, [initialOutline]);

 
    return (
        <div className="bg-white h-full rounded">

            {/* 设置页面 */}
            {(showSettingPanel && outline) && (
                <OutlineSettingPanel
                    outline={outline}
                    onClose={(changed, outline?) => {
                        setShowSettingPanel(false);
                        if (changed && outline) {
                            // setOutline(outline);
                            onOutlineEdit(outline);
                        }
                    }}
                />
            )}

            <div className='flex flex-col h-full'>
                {/* 面包屑导航 */}
                <div className="p-4 border-b border-gray-200">
                    {breadcrumb && breadcrumb.length > 0 ? (
                    <div className="flex items-center text-sm text-gray-600">
                        {breadcrumb.map((file, index) => (
                        <React.Fragment key={file.id}>
                            <span className="hover:text-blue-600 cursor-pointer">{file.name}</span>
                            {index !== breadcrumb.length - 1 && <span className="mx-2">/</span>}
                        </React.Fragment>
                        ))}
                    </div>
                    ) : (
                    <div className="text-sm text-gray-500 italic">未选择任务</div>
                    )}
                </div>
                
                {/* 面包屑下方空间，做一个卡片视图 */}
                {outline && (
                    <div className="flex flex-col p-4 bg-white space-y-4 grow overflow-hidden">
                        {/* 标题 */}
                        <div className='flex justify-start space-x-4 items-center'>
                            <div className='flex space-x-1'>
                                {/* 一个小标签，显示 outline 的 p_type */}
                                <span className='px-1 py-1 bg-gray-200 text-gray-700 rounded text-sm'>
                                    {P_TYPE_DISPLAY[outline.p_type]}
                                </span>
                                <h1 className='text-2xl font-bold'>{outline.name}</h1>
                            </div>
                            <button className='px-2 py-1 bg-white border border-blue-500 text-blue-500 rounded'
                                onClick={() => {
                                    setShowSettingPanel(true);
                                }}
                            >
                                设置
                            </button>
                        </div>

                        {outline.p_type == 'content' && (
                            <>
                                {/* 关联文档 */}
                                <div className='flex'>
                                    <RelatedFiles
                                    outline={outline}
                                    project_id={project.id}
                                    />
                                </div>

                                {/* 页面内容 */}
                                <div className='flex grow'>
                                    <OutlineContent
                                        id={outline.id}
                                        currentMenu='full_text'
                                    />
                                </div>
                            </>
                        )}

                        {outline.p_type == 'template' && (
                            <>
                                {/* 页面内容 */}
                                <div className='flex grow overflow-hidden'>
                                    <TemplateOutlineContent
                                        sections={project.template.sections}
                                        outline={outline}
                                    />
                                </div>
                            </>
                        )}

                    </div>
                )}


            </div>
        </div>
    )
}