'use client';
import { useEffect, useState, use } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { useRouter } from 'next/navigation';

// 基本信息
import { ProjectInfo } from '@/app/components/projectInfo/ProjectInfo';

// 素材收集的相关引入
import MaterialTaskList from '@/app/components/materials/MaterialTaskList';
import { Task } from '@/app/components/materials/TaskItem';
import { MaterialTaskPanel } from '@/app/components/materials/MaterialTaskPanel';

// 大纲收集的相关引入
import OutlineTaskList from '@/app/components/outline/OutlineTaskList';
import { OutlineTask } from '@/app/components/outline/TaskItem'
import { OutlineTaskPanel } from '@/app/components/outline/OutlineTaskPanel';
import { Project } from '@/app/components/projectInfo/ProjectInfo';

// PPT 生成相关引入
import { PPTGenerateProgress } from '@/app/components/pptGenerate/PPTGenerateProgress';

interface ProjectResponse {
    status: string;
    project: Project;
}

const ProjectDetailPage = ({ params }: { params: Promise<{ project_id: string }> }) => {
    const [project, setProject] = useState<Project | null>(null);
    const [error, setError] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'materials' | 'outline' | 'ppt'>('ppt');
    const resolvedParams = use(params);
    const router = useRouter();

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        setProject(prevProject => {
            if (!prevProject) return prevProject;

            const updateTaskStatus = (tasks: any[]): any[] => {
                return tasks.map(task => {
                    if (task.id === taskId) {
                        // 使用组件传递的新状态
                        return { ...task, status: newStatus };
                    }
                    if (task.sub_tasks && task.sub_tasks.length > 0) {
                        return { ...task, sub_tasks: updateTaskStatus(task.sub_tasks) };
                    }
                    return task;
                });
            };

            return {
                ...prevProject,
                material_tasks: updateTaskStatus(prevProject.material_tasks)
            };
        });
    };


    // 处理 素材收集 选中任务
    const [chosenTask, setChosenTask] = useState<Task | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<Task[] | undefined>(undefined);
    const handleChooseTask = (task: Task | null, breadcrumb: Task[] | undefined) => {
        console.log(breadcrumb);
        setChosenTask(task);
        setBreadcrumb(breadcrumb);
    };
    
    
    useEffect(() => {
        const fetchProject = async () => {
            try {
                const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/projects/${resolvedParams.project_id}`;
                const csrfToken = getCookie('csrftoken');
                const response = await axios.get<ProjectResponse>(apiUrl,
                    {
                        headers: {
                            'X-CSRFToken': csrfToken,
                        },
                        withCredentials: true,
                    }
                );
                if (response.data.status === 'success') {
                    setProject(response.data.project);
                    setActiveTab(response.data.project.stage);
                }
            } catch (err: any) {
                if (err.response?.status === 404) {
                    setError(true);
                }
            }
        };
        
        fetchProject();
    }, [resolvedParams.project_id]);

    // 处理 outline 相关逻辑
    const [chosenOutline, setChosenOutline] = useState<OutlineTask | null>(null);
    const [outlineBreadcrumb, setOutlineBreadcrumb] = useState<OutlineTask[] | undefined>(undefined);
    const handleChooseOutline = (task: OutlineTask | null, breadcrumb: OutlineTask[] | undefined) => {
        setChosenOutline(task);
        setOutlineBreadcrumb(breadcrumb);
    };

    // 处理 outline 编辑
    const [editedOutline, setEditedOutline] = useState<OutlineTask | null>(null);
    const handleOutlineEdit = (outline: OutlineTask) => {
        setEditedOutline(outline);
    };

    if (error) {
        return <div>项目未找到</div>;
    }

    if (!project) {
        return <div>加载中...</div>;
    }

    const handleChangeStage = async (projectId: number, stage: string) => {
    try {
      // 获取CSRF token
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      // 发起请求更新工程阶段
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/change_stage/`,
        { stage: stage },
        {
          headers: {
            'X-CSRFToken': csrfToken,
          },
          withCredentials: true
        }
      );

    } catch (err) {
      console.error('Error changing project stage:', err);
      alert('更新失败，请稍后重试');
    }
  };

//   return (
//     <div className="flex flex-col h-screen">
//         <div>1</div>
//         <div className="grow bg-blue-200 w-full">
//             <div className="h-full w-full overflow-hidden">

//                 <div className="bg-red-200 h-[1200px]">

//                 </div>
//             </div>
//         </div>
//     </div>

//   )


    return (
        <div className="flex h-screen">
            <div className="max-w-min min-w-[200px] bg-gray-200 p-4">

                {/* 返回按钮，返回 /projects */}
                <div className="w-full p-2 cursor-pointer space-x-2 flex items-center mb-6 border-b-1 border-gray-300" onClick={() => router.push('/projects')}>
                    {/* 图标 */}
                    <i className="fas fa-angle-left"></i>
                    <span>返回</span>
                </div>

                <ul className="space-y-2">
                    <li>
                        <button
                            className={`w-full p-2 rounded ${activeTab === 'basic' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`}
                            onClick={() => setActiveTab('basic')}
                        >
                            基础信息
                        </button>
                    </li>
                    <li>
                        <button
                            className={`w-full p-2 rounded ${activeTab === 'materials' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`}
                            onClick={() => {handleChangeStage(project.id, 'materials'); setActiveTab('materials')}}
                        >
                            素材收集
                        </button>
                    </li>
                    <li>
                        <button
                            className={`w-full p-2 rounded ${activeTab === 'outline' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`}
                            onClick={() => {handleChangeStage(project.id, 'outline'); setActiveTab('outline')}}
                        >
                            材料大纲
                        </button>
                    </li>
                    <li>
                        <button
                            className={`w-full p-2 rounded ${activeTab === 'ppt' ? 'bg-blue-500 text-white' : 'hover:bg-gray-300'}`}
                            onClick={() => {handleChangeStage(project.id, 'ppt'); setActiveTab('ppt')}}
                        >
                            PPT生成
                        </button>
                    </li>
                </ul>
            </div>
            <div className="w-full flex">
                {activeTab === 'basic' && (
                    <div className="bg-gray-50 h-full w-full space-x-2 p-4 flex">
                        <ProjectInfo project={project} />
                    </div>
                )}
                {activeTab === 'materials' && (
                    <div className="bg-gray-50 h-full w-full space-x-2 p-4 flex">
                        <div className="h-full  min-w-[200px] max-w-[20%] p-2"  style={{scrollbarWidth: "none"}}>
                            <MaterialTaskList project_id={project.id} chosenTaskId={chosenTask?.id} tasks={project.material_tasks} onChooseTask={handleChooseTask} />
                        </div>
                        <div className="h-full grow">
                            <MaterialTaskPanel chosenTask={chosenTask} breadcrumb={breadcrumb} />
                        </div>
                    </div>
                )}
                {activeTab === 'outline' && (
                    <div className="bg-gray-50 h-full w-full space-x-4 p-4 flex">
                        <div className="h-full  min-w-[200px] max-w-[20%] flex flex-col space-y-2"  style={{scrollbarWidth: "none"}}>
                            <OutlineTaskList project_id={project.id} chosenTaskId={chosenOutline?.id} tasks={project.outline} onChooseTask={handleChooseOutline} editedOutline={editedOutline} />
                        </div>
                        <div className="h-full grow">
                            <OutlineTaskPanel outline={chosenOutline} breadcrumb={outlineBreadcrumb} project={project} onOutlineEdit={handleOutlineEdit} />
                        </div>
                    </div>
                )}
                {activeTab === 'ppt' && (
                    <div className="h-full w-full bg-gray-50">
                        <PPTGenerateProgress project_id={project.id} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailPage;