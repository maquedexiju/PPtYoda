import Link from 'next/navigation';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useState, useEffect } from 'react';

import { getCookie } from '@/lib/cookies';

// 添加Props接口定义
interface NavProps {
  currentMenu: 'projects' | 'templates' | 'knowledge';
}

// 接收currentMenu参数
const Nav = ({ currentMenu }: NavProps) => {
  // 假设从全局状态或认证上下文获取当前用户
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    email: string;
  } | null>(null);
  const router = useRouter();

  const handleLogout = async () => {

    const url = process.env.NEXT_PUBLIC_API_URL + '/users/logout/';
    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      throw new Error('CSRF token not found');
    }
    // 发起请求退出登录
    await axios.post(url, {}, {
      headers: {
        'X-CSRFToken': csrfToken,
      },
      withCredentials: true
    });
    // 重定向到登录页
    router.push('/login');
  };

  // 获取用户信息
  const fetchUserInfo = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL + '/users/user_info/';
      const response = await axios.get<{
        status: string;
        user: {
          id: number;
          username: string;
          email: string;
        };
      }>(apiUrl, {
        withCredentials: true
      });
      if (response.data.status === 'success') {
        setCurrentUser(response.data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 组件加载时获取用户信息
  useEffect(() => {
    fetchUserInfo();
  }, []);

  return (
    <nav className="bg-gray-800 text-white shadow-md fixed top-0 left-0 right-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 左侧菜单 */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl">PPt 助手</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {/* 项目列表 - 根据currentMenu动态设置下划线 */}
              <a href="/projects">
                <span className={`${currentMenu === 'projects' ? 'border-gray-300' : 'border-transparent'} text-gray-300 hover:bg-gray-700 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  <i className="fas fa-list-ul mr-2"></i>
                  项目列表
                </span>
              </a>
              {/* 模板管理 - 根据currentMenu动态设置下划线 */}
              <a href="/templates">
                <span className={`${currentMenu === 'templates' ? 'border-gray-300' : 'border-transparent'} text-gray-300 hover:bg-gray-700 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  <i className="fas fa-th-large mr-2"></i>
                  模板管理
                </span>
              </a>
              {/* 知识库管理 - 根据currentMenu动态设置下划线 */}
              <a href="/knowledge">
                <span className={`${currentMenu === 'knowledge' ? 'border-gray-300' : 'border-transparent'} text-gray-300 hover:bg-gray-700 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  <i className="fas fa-book mr-2"></i>
                  知识库管理
                </span>
              </a>
            </div>
          </div>

          {/* 右侧用户信息 */}
          <div className="flex items-center">
            <div className="ml-3 relative">
              <div className="flex items-center">
                <span className="mr-3 text-sm font-medium">{currentUser?.username}，今天过得怎么样？</span>
                <button
                  onClick={handleLogout}
                  className="bg-transparent hover:bg-red-500 text-white py-2 px-4 rounded text-sm"
                >
                  <i className="fas fa-sign-out-alt mr-1"></i>
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Nav;