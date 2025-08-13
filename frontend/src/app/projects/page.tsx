'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { useRouter } from 'next/navigation';
import CreateProjectButton from './CreateProjectButton';
import Nav from '@/app/components/general/Nav';

// 定义工程接口类型
interface ProjectsResponse {
  projects: PPTProject[];
}

interface PPTProject {
  id: number;
  name: string;
  theme: string;
  audience: string;
  place: string;
  duration: number;
  target: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<PPTProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [detailPopup, setDetailPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    project: PPTProject | null;
  }>({ visible: false, x: 0, y: 0, project: null });

  const handleShowDetail = (e: React.MouseEvent<HTMLButtonElement>, project: PPTProject) => {
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 256; // w-64
    const popupHeight = 160;

    // 计算初始位置（按钮右侧）
    let x = buttonRect.right + 10;
    let y = buttonRect.top;

    // 右侧空间不足时显示在左侧
    if (x + popupWidth > window.innerWidth) {
      x = buttonRect.left - popupWidth - 10;
    }

    // 下方空间不足时向上调整
    if (y + popupHeight > window.innerHeight) {
      y = Math.max(0, window.innerHeight - popupHeight - 10);
    }

    setDetailPopup({
      visible: true,
      x,
      y,
      project
    });
  };

  const handleHideDetail = () => {
    setDetailPopup(prev => ({ ...prev, visible: false }));
  };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // 获取CSRF token
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
          throw new Error('CSRF token not found');
        }

        // 发起请求获取工程列表
        const response = await axios.get<ProjectsResponse>(apiUrl + '/projects/', {
          headers: {
            'X-CSRFToken': csrfToken,
          },
          withCredentials: true
        });

        setProjects(response.data.projects);
        setLoading(false);
      } catch (err) {
        setError('获取工程列表失败，请稍后重试');
        setLoading(false);
        console.error('Error fetching projects:', err);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <>
      <Nav currentMenu="projects" />
      <div className="container mx-auto p-8 bg-white mt-[56px] h-[calc(100vh-56px)]">
        <div className="flex justify-start gap-x-4 items-center mb-6">
          <h1 className="text-xl font-bold">项目列表</h1>
          <CreateProjectButton />
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无工程数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100">
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{project.name}</h3>
                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <p>创建时间: {project.created_at}</p>
                    <p>最后修改: {project.updated_at}</p>
                  </div>
            {detailPopup.visible && (
              <div 
                className="fixed bg-white rounded-md shadow-lg p-4 z-50 border w-64"
                style={{ left: `${detailPopup.x}px`, top: `${detailPopup.y}px` }}
                onMouseLeave={handleHideDetail}
              >
                <h4 className="font-medium text-gray-900 mb-2">工程详情</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">主题:</span> {detailPopup.project?.theme}</p>
                  <p><span className="font-medium text-gray-700">受众:</span> {detailPopup.project?.audience}</p>
                  <p><span className="font-medium text-gray-700">地点:</span> {detailPopup.project?.place}</p>
                  <p><span className="font-medium text-gray-700">目标:</span> {detailPopup.project?.target}</p>
                  <p><span className="font-medium text-gray-700">时长:</span> {detailPopup.project?.duration} 分钟</p>
                </div>
              </div>
            )}
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="text-sm px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        进入项目
                      </button>
                      <button 
                        className="text-sm px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        onMouseEnter={(e) => handleShowDetail(e, project)}
                        onMouseLeave={handleHideDetail}
                      >
                        详情
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}