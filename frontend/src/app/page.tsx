'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 通用的获取cookie函数
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查用户是否已登录（通过csrftoken cookie判断）
    // const isLoggedIn = !!getCookie('csrftoken');
    const isLoggedIn = getCookie('sessionid');
    console.log('isLoggedIn', isLoggedIn);

    if (!isLoggedIn) {
      // 未登录用户重定向到登录页面，并设置登录后返回projects页面
      router.push('/login?redirect=/projects');
    } else {
      // 已登录用户直接跳转到projects页面
      router.push('/projects');
    }
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="text-center">
        <p className="text-sm text-gray-600">
          正在检查您的登录状态...
        </p>
      </div>
    </main>
  );
}
