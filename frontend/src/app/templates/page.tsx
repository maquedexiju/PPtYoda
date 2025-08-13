'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import { useRouter } from 'next/navigation';
import Nav from '@/app/components/general/Nav';

// 定义模板接口类型
interface Template {
  id: number;
  name: string;
  created_at: string;
  file_url?: string;
}

interface TemplatesResponse {
  ppt_templates: Template[];
}

interface CreateTemplateFormData {
  name: string;
  file: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateTemplateFormData>({
    name: '',
    file: ''
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [isFormAvailable, setIsFormAvailable] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  const router = useRouter();

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      const response = await axios.get<TemplatesResponse>(`${apiUrl}/ppt_template/list/`, {
        headers: {
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true
      });

      setTemplates(response.data.ppt_templates);
      setLoading(false);
    } catch (err) {
      setError('获取模板列表失败，请稍后重试');
      setLoading(false);
      console.error('Error fetching templates:', err);
    }
  };

  // 检查表单可用性
  const checkFormAvailability = async () => {
    if (!formData.name.trim()) return;

    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      const response = await axios.post<{ available: boolean }>(
        `${apiUrl}/ppt_template/check_name_available/`,
        { name: formData.name },
        {
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );

      setIsFormAvailable(response.data.available);
    } catch (err) {
      setError('检查表单可用性失败，请稍后重试');
      console.error('Error checking form availability:', err);
    }
  };

  // 创建模板
  const handleCreateTemplate = async () => {
    console.log(formData);
    if (!formData.name || !formData.file) {
      alert('请输入模板名称并选择文件');
      return;
    }

    try {
      setUploading(true);
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      await axios.post(`${apiUrl}/ppt_template/create/`, formData, {
        headers: {
          'X-CSRFToken': csrfToken,
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      // 重置表单并刷新列表
      setFormData({ name: '', file: '' });
      setIsFormAvailable(true);
      setShowCreateModal(false);
      fetchTemplates();
      alert('模板创建成功');
    } catch (err) {
      setError('创建模板失败，请稍后重试');
      console.error('Error creating template:', err);
    } finally {
      setUploading(false);
    }
  };

  // 删除模板
  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('确定要删除此模板吗？')) {
      return;
    }

    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      await axios.delete(`${apiUrl}/ppt_template/delete/${id}/`, {
        headers: {
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true
      });

      // 刷新列表
      fetchTemplates();
      alert('模板删除成功');
    } catch (err) {
      setError('删除模板失败，请稍后重试');
      console.error('Error deleting template:', err);
    }
  };

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // 移除base64前缀
    //   const fileBase64 = base64String.split(',')[1];
      setFormData(prev => ({ ...prev, file: base64String }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <>
      <Nav currentMenu="templates" />
      <div className="container mx-auto p-8 bg-white mt-[56px] h-[calc(100vh-56px)] ">
        <div className="flex justify-start space-x-4 items-center mb-6">
          <h1 className="text-xl font-bold">模板管理</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            创建模板
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">暂无模板数据</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              创建第一个模板
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100">
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{template.name}</h3>
                  <div className="text-sm text-gray-500 mb-4">
                    <p>创建时间: {new Date(template.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-sm px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      删除模板
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建模板弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">创建新模板</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={checkFormAvailability}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="输入模板名称"
                />
              </div>
              {!isFormAvailable && (
                <div className="text-sm text-red-500">
                  模板名称已存在，请重新输入
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上传模板文件</label>
                <input
                  type="file"
                  accept=".pptx"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">支持 .pptx 格式文件</p>
              </div>
              {formData.file && (
                <div className="text-sm text-green-600">
                  ✅ 文件已准备就绪
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={uploading || !isFormAvailable || !formData.file}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {uploading ? '上传中...' : '创建模板'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}