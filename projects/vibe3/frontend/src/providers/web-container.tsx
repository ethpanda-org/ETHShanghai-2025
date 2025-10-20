import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { WebContainer } from '@webcontainer/api';

export type WebContainerStatus = 'booting' | 'booted'| 'deps-installing' | 'deps-installed' | 'server-starting' | 'server-started' | 'server-started' | 'error';


// 全局变量来存储 WebContainer 实例，确保整个应用只有一个实例
let globalWebContainer: WebContainer | null = null;
let initializationPromise: Promise<WebContainer> | null = null;

interface WebContainerContextType {
    webContainer: WebContainer | null;
    status: WebContainerStatus;
    setStatus: (status: WebContainerStatus) => void;
    error: Error | null;
    runtimeError: string | null;
    setRuntimeError: (error: string | null) => void;
    previewUrl: string | null;
    getWebContainer: () => WebContainer | null;
}

export const WebContainerContext = createContext<WebContainerContextType>({
    webContainer: null,
    status: 'booting',
    setStatus: () => { },
    error: null,
    runtimeError: null,
    setRuntimeError: () => { },
    previewUrl: null,
    getWebContainer: () => null,
});

interface WebContainerProviderProps {
    children: ReactNode;
}

export function WebContainerProvider({ children }: WebContainerProviderProps) {
    const [status, setStatus] = useState<WebContainerStatus>('booting');
    const [error, setError] = useState<Error | null>(null);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const initializeWebContainer = async () => {
            // 确保只在客户端执行
            if (typeof window === 'undefined') {
                return;
            }

            // 如果全局实例已存在，直接使用
            if (globalWebContainer) {
                setStatus('booted');
                return;
            }

            // 如果正在初始化，等待初始化完成
            if (initializationPromise) {
                try {
                    await initializationPromise;
                    setStatus('booted');
                } catch (err) {
                    setError(err instanceof Error ? err : new Error('Failed to initialize WebContainer'));
                    setStatus('error');
                }
                return;
            }

            // 开始初始化
            setError(null);
            setStatus('booting');

            try {
                console.log('Initializing WebContainer...');
                initializationPromise = WebContainer.boot({
                    coep: 'credentialless',
                });
                globalWebContainer = await initializationPromise;
                globalWebContainer.on('server-ready', (prot, url) => setPreviewUrl(url));
                globalWebContainer.on('error', (data) => {
                    console.error(data);
                });
                setStatus('booted');
                console.log('WebContainer initialized successfully');
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to initialize WebContainer');
                console.error('Failed to initialize WebContainer:', error);
                setError(error);
                setStatus('error');
                globalWebContainer = null;
            } finally {
                initializationPromise = null;
            }
        };

        initializeWebContainer();
    }, []);

    const getWebContainer = () => {
        return globalWebContainer;
    }

    const contextValue: WebContainerContextType = {
        webContainer: globalWebContainer,
        status,
        setStatus,
        error,
        runtimeError,
        setRuntimeError,
        previewUrl,
        getWebContainer
    };

    return (
        <WebContainerContext.Provider value={contextValue}>
            {children}
        </WebContainerContext.Provider>
    );
}

export const useWebContainer = () => {
    return useContext(WebContainerContext);
};

// 清理全局 WebContainer 实例的函数
export function cleanupWebContainer() {
    globalWebContainer = null;
    initializationPromise = null;
}