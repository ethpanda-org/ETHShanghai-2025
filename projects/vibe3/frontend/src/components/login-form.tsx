'use client';

import { useState } from 'react';
import { login } from '@/services/vibe3_api/auth';
import { useAuth } from '@/hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { logout } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      if (response.success) {
        // 登录成功，token已经自动保存到localStorage
        // 刷新页面以更新认证状态
        window.location.reload();
      } else {
        setError(response.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-card border rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">登录测试</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            邮箱
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            required
          />
        </div>
        
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      </form>
      
      <div className="mt-4 pt-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/90"
        >
          登出
        </button>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground">
        <p>Token会自动保存到localStorage中</p>
        <p>刷新页面后会自动检查认证状态</p>
      </div>
    </div>
  );
}
