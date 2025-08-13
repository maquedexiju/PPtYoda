'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getCookie } from '@/lib/cookies';
import Nav from '@/app/components/general/Nav';
import { KnowledgeBase } from '@/app/components/knowlegeBase/KnowlegeBase';

interface KnowledgeBasesResponse {
  knowledge_bases: KnowledgeBase[];
}

interface CreateKnowledgeBaseFormData {
  name: string;
  file: string;
}

export default function KnowledgePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateKnowledgeBaseFormData>({
    name: '',
    file: ''
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [isFormAvailable, setIsFormAvailable] = useState<boolean>(true);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [currentKnowledgeBaseId, setCurrentKnowledgeBaseId] = useState<number | null>(null);
  const [updateFile, setUpdateFile] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  // 获取列表
  const fetchKnowledgeBases = async () => {
    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }
  
      const response = await axios.post<KnowledgeBasesResponse>(`${apiUrl}/knowledge_base/list/`, {}, {
        headers: {
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true
      });
  
      setKnowledgeBases(response.data.knowledge_bases);
      setLoading(false);
    } catch (err) {
      setError('获取知识库列表失败，请稍后重试');
      setLoading(false);
      console.error('Error fetching knowledge bases:', err);
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
        `${apiUrl}/knowledge_base/check_name_available/`,
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
      setError('检查名称可用性失败，请稍后重试');
      console.error('Error checking form availability:', err);
    }
  };

  // 创建
  const handleCreateKnowledgeBase = async () => {
    if (!formData.name || !formData.file) {
      alert('请输入名称并选择文件');
      return;
    }
  
    try {
      setUploading(true);
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }
  
      // 提取base64数据部分（移除data URL前缀）
    //   const fileBase64 = formData.file.split(',')[1];
    const fileBase64 = formData.file;
  
      await axios.post(`${apiUrl}/knowledge_base/create/`, 
        { name: formData.name, file: fileBase64 },
        {
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
  
      // 重置表单并刷新列表
      setFormData({ name: '', file: '' });
      setIsFormAvailable(true);
      setShowCreateModal(false);
      fetchKnowledgeBases();
      alert('知识库创建成功');
    } catch (err) {
      setError('创建知识库失败，请稍后重试');
      console.error('Error creating knowledge base:', err);
    } finally {
      setUploading(false);
    }
  };
  
  // 删除知识库
  const handleDeleteKnowledgeBase = async (id: number) => {
    if (!confirm('确定要删除此知识库吗？')) {
      return;
    }
  
    try {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }
  
      await axios.delete(`${apiUrl}/knowledge_base/delete/${id}/`, {
        headers: {
          'X-CSRFToken': csrfToken,
        },
        withCredentials: true
      });
  
      // 刷新列表
      fetchKnowledgeBases();
      alert('知识库删除成功');
    } catch (err) {
      setError('删除知识库失败，请稍后重试');
      console.error('Error deleting knowledge base:', err);
    }
  };

  // 处理文件上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, file: base64String }));
    };
    reader.readAsDataURL(file);
  };

  // 处理更新文件上传
  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setUpdateFile(base64String);
    };
    reader.readAsDataURL(file);
  };
  
  // 更新知识库文件
  const handleUpdateKnowledgeBaseFile = async () => {
    if (!currentKnowledgeBaseId || !updateFile) return;
  
    try {
      setUpdating(true);
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }
  
      // 提取base64数据部分
      const fileBase64 = updateFile;
  
      await axios.patch(`${apiUrl}/knowledge_base/update_file/${currentKnowledgeBaseId}/`, 
        { file: fileBase64 },
        {
          headers: {
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
  
      // 重置状态并刷新列表
      setUpdateFile('');
      setShowUpdateModal(false);
      fetchKnowledgeBases();
      alert('知识库文件更新成功');
    } catch (err) {
      setError('更新知识库文件失败，请稍后重试');
      console.error('Error updating knowledge base file:', err);
    } finally {
      setUpdating(false);
    }
  };
  
  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <> 
      <Nav currentMenu="knowledge" />
      <div className="container mx-auto p-8 bg-white mt-[56px] h-[calc(100vh-56px)] ">
        <div className="flex justify-start space-x-4 items-center mb-6">
          <h1 className="text-xl font-bold">知识库管理</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            创建知识库
          </button>
        </div>
  
        {knowledgeBases.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">暂无知识库数据</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              创建第一个知识库
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgeBases.map((knowledgeBase) => (
              <div key={knowledgeBase.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100">
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{knowledgeBase.name}</h3>
                  <div className="text-sm text-gray-500 mb-4">
                    <p>创建时间: {new Date(knowledgeBase.created_at).toLocaleString()}</p>
                    <p>最后修改: {new Date(knowledgeBase.updated_at).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setCurrentKnowledgeBaseId(knowledgeBase.id);
                        setShowUpdateModal(true);
                      }}
                      className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      更新
                    </button>
                    <button
                      onClick={() => handleDeleteKnowledgeBase(knowledgeBase.id)}
                      className="text-sm px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">创建新知识库</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={checkFormAvailability}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="输入知识库名称"
                />
              </div>
              {!isFormAvailable && (
                <div className="text-sm text-red-500">
                  名称已存在，请重新输入
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上传文件</label>
                <input
                  type="file"
                  accept=".sqlite3"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">支持 .sqlite3 格式文件</p>
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
                onClick={handleCreateKnowledgeBase}
                disabled={uploading || !isFormAvailable || !formData.file}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {uploading ? '上传中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 更新文件弹窗 */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">更新知识库文件</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择新文件</label>
                <input
                  type="file"
                  accept=".sqlite3"
                  onChange={handleUpdateFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">支持 .sqlite3 格式文件</p>
              </div>
              {updateFile && (
                <div className="text-sm text-green-600">
                  ✅ 文件已准备就绪
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdateFile('');
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleUpdateKnowledgeBaseFile}
                disabled={updating || !updateFile}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
              >
                {updating ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
