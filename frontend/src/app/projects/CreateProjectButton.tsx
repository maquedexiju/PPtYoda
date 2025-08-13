'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { useRouter } from 'next/navigation';

import { PPtTemplate } from '@/app/components/pptTemplate/PPtTemplate';
import { KnowledgeBase } from '@/app/components/knowlegeBase/KnowlegeBase';

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

interface ProjectCreateFormData {
  theme: string;
  audience: string;
  place: string;
  duration: number;
  target: string;
  template: PPtTemplate | null;
  knowledge_base: KnowledgeBase | null; // 添加知识库ID字段
}

interface WebSocketResponse {
  status: 'doing' | 'success';
  desc?: string;
  project_id?: number;
}

const CreateProjectButton = () => {

  const getPPTTemplates = async () => {
    const csrfToken = getCookie('csrftoken');
    const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + '/ppt_template/list/', {}, {
      headers: {
        'X-CSRFToken': csrfToken,
      },
      withCredentials: true
    });
    return (res.data as { ppt_templates: PPtTemplate[] }).ppt_templates;
  }
  
  // 打开时，先获取模板列表
  const [pptTemplates, setPPTTemplates] = useState<PPtTemplate[]>([]);
  useEffect(() => {
    getPPTTemplates().then(templates => {
      setPPTTemplates(templates);
    });
  }, []);

  // 获取知识库列表
  const getKnowledgeBases = async () => {
    const csrfToken = getCookie('csrftoken');
    const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + '/knowledge_base/list/', {}, {
      headers: {
        'X-CSRFToken': csrfToken,
      },
      withCredentials: true
    });
    return (res.data as { knowledge_bases: KnowledgeBase[] }).knowledge_bases;
  }

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  useEffect(() => {
    getKnowledgeBases().then(kbs => {
      setKnowledgeBases(kbs);
    });
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProjectCreateFormData>({
    theme: '',
    audience: '',
    place: '',
    duration: 0,
    target: '',
    template: pptTemplates[0] || null,
    knowledge_base: null, // 初始化知识库状态
  });
  const [modalStatus, setModalStatus] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || '/api';

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalStatus(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value, 10) : value,
    }));
  };

  const handleTemplateChoice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    // string 转 number
    const templateId = parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      template: pptTemplates.find(template => template.id === templateId) || null,
    }));
    
  };

  const handleKnowledgeBaseChoice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    // string 转 number
    const kbId = parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      knowledge_base: knowledgeBases.find(kb => kb.id === kbId) || null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('formData', formData);
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      // 建立 WebSocket 连接监听状态
      const ws = new WebSocket(wsUrl + '/projects/create/');

      ws.onopen = () => {
        // 发送创建项目请求
        ws.send(JSON.stringify(formData));
      };

      // 处理 WebSocket 响应
      ws.onmessage = (event) => {
        console.log(event);
        const data: WebSocketResponse = JSON.parse(event.data);
        if (data.status === 'doing') {
          setModalStatus({ message: data.desc || '项目创建中...', isError: false });
        } else if (data.status === 'success') {
          ws.close();
          if (data.project_id) {
            router.push(`/projects/${data.project_id}`);
          }
        }
      };

      ws.onerror = () => {
        setModalStatus({ message: 'WebSocket 连接失败，请重试', isError: true });
        ws.close();
        setIsSubmitting(false);
      };
    } catch (err) {
      setModalStatus({ message: '创建项目失败，请稍后重试', isError: true });
      console.error('Error creating project:', err);
      setIsSubmitting(false);
    }
  }

  return (
    <> 
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        onClick={handleOpenModal}
      >
        创建项目
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">创建新项目</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">主题</label>
                  <input
                    type="text"
                    name="theme"
                    value={formData.theme}
                    onChange={handleChange}
                    className="mt-1 p-2 w-full border rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">受众</label>
                  <input
                    type="text"
                    name="audience"
                    value={formData.audience}
                    onChange={handleChange}
                    className="mt-1 p-2 w-full border rounded-md"
                    placeholder="材料受众，例如：公司领导、销售、消费者、三年级的小学生"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">场合</label>
                  <input
                    type="text"
                    name="place"
                    value={formData.place}
                    onChange={handleChange}
                    className="mt-1 p-2 w-full border rounded-md"
                    placeholder="例如：公司会议室、发布会、培训"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">时长 (分钟)</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="mt-1 p-2 w-full border rounded-md"
                    placeholder="以分钟为单位"
                    required
                    min="1"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">目标</label>
                  <input
                    type="text"
                    name="target"
                    value={formData.target}
                    onChange={handleChange}
                    className="mt-1 p-2 w-full border rounded-md"
                    placeholder="例如：介绍新产品的亮点、汇报工作进展、总结经验教训"
                    required
                  />
                </div>
                {/* 增加选择模板的下拉列表 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">选择模板</label>
                  <select
                    name="template"
                    value={formData.template?.id || ''}
                    onChange={handleTemplateChoice}
                    className="mt-1 p-2 w-full border rounded-md"
                  >
                    <option value="">请选择模板</option>
                    {pptTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* 增加选择模板的下拉列表 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">选择知识库</label>
                  <select
                    name="knowledge_base"
                    value={formData.knowledge_base?.id || ''}
                    onChange={handleKnowledgeBaseChoice}
                    className="mt-1 p-2 w-full border rounded-md"
                  >
                    <option value="">请选择知识库</option>
                    {knowledgeBases.map(kb => (
                      <option key={kb.id} value={kb.id}>
                        {kb.name}
                      </option>
                    ))}
                  </select>
                </div>
                {modalStatus && (
                  <div className={`mb-4 p-2 rounded-md ${modalStatus.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {modalStatus.message}
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    onClick={handleCloseModal}
                  >
                    取消
                  </button>
                  <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  // disabled={isSubmitting}
                >
                    {isSubmitting ? '提交中...' : '提交'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateProjectButton;