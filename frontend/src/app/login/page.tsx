'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

// 通用的获取cookie函数
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// 获取CSRF token的函数
const getCsrfToken = (): string | null => {
  return getCookie('csrftoken');
};

// 验证重定向路径是否安全
const isSafeRedirect = (path: string): boolean => {
  // 只允许相对路径，防止开放重定向攻击
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('http://') && !path.startsWith('https://');
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  // 从URL参数获取重定向路径，默认为仪表板
  const redirectPath = searchParams.get('redirect') || '/projects';

  // 页面加载时获取CSRF token
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        await axios.get(`${apiUrl}/users/csrf/`, { withCredentials: true });
      } catch (err) {
        console.error('获取CSRF token失败:', err);
      }
    };

    fetchCsrfToken();
  }, [apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        throw new Error('无法获取CSRF token，请刷新页面重试');
      }

      // 登录API调用逻辑，包含CSRF token处理
      const response = await axios.post(`${apiUrl}/users/login/`, {
        username,
        password
      }, {
        headers: {
          'X-CSRFToken': csrfToken
        },
        withCredentials: true
      });

      // 登录成功后重定向，确保路径安全，并传递 username
      const safeRedirectPath = isSafeRedirect(redirectPath) ? redirectPath : '/projects';
      if ((response.data as { status?: string })?.status && (response.data as { status?: string }).status === 'success') {
        router.push(safeRedirectPath);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            欢迎使用 PPT 助手
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 添加隐藏字段存储重定向路径 */}
          <input type="hidden" name="redirect" value={redirectPath} />
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="text-sm font-medium text-red-800">
                  {error}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}