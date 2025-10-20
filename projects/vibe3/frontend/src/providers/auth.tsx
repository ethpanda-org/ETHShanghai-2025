'use client'
import { createContext, useState, useEffect } from 'react'
import { getCurrentUser, isAuthenticated, logout as authLogout, type Profile } from '@/services/vibe3_api/auth';

export const AuthContext = createContext({
    user: null as Profile | null,
    isLoading: false,
    isAuthenticated: () => false as boolean,
    logout: () => { },
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = () => {
        authLogout();
        setUser(null);
    };

    useEffect(() => {
        setIsLoading(true);
        // 检查是否有token，如果有则尝试获取用户信息
        if (isAuthenticated()) {
            getCurrentUser()
                .then((res) => {
                    if (res.success && res.data) {
                        setUser(res.data as Profile);
                    }
                })
                .catch((err) => {
                    console.warn('get current user failed:', err);
                    // 如果获取用户信息失败，可能是token过期，清除token, 用户信息不存在
                    if (err.status === 401) {
                        handleLogout();
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [])

    return (
        <AuthContext.Provider value={{ user, isLoading, isAuthenticated: isAuthenticated, logout: handleLogout }}>
            {children}
        </AuthContext.Provider>
    )
}