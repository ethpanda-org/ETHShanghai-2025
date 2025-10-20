'use client';

import { useState, useRef, useCallback, ReactNode, useEffect } from 'react';

interface FrameProps {
    leftPanel: ReactNode;
    rightPanel: ReactNode;
    defaultLeftWidth?: number; // 左侧面板默认宽度（px）
    minLeftWidth?: number; // 左侧面板最小宽度（px）
    maxLeftWidth?: number; // 左侧面板最大宽度（px）
    className?: string;
    barWidth?: number; // 拖拽条宽度
    onLeftPanelWidthChange?: (width: number) => void;
}

export function Frame({
    leftPanel,
    rightPanel,
    defaultLeftWidth = 460, // 默认300px
    minLeftWidth = 0, // 最小100px
    maxLeftWidth = 2000, // 最大800px
    className = '',
    barWidth = 4,
    onLeftPanelWidthChange
}: FrameProps) {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;

        // 计算新的左侧宽度（px）
        let newLeftWidth = mouseX;

        // 限制在最小和最大宽度范围内
        newLeftWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));

        setLeftWidth(newLeftWidth);
        
        // 实时调用回调函数返回当前宽度
        if (onLeftPanelWidthChange) {
            onLeftPanelWidthChange(newLeftWidth);
        }
    }, [isDragging, minLeftWidth, maxLeftWidth, onLeftPanelWidthChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // 组件初始化时调用回调函数
    useEffect(() => {
        if (onLeftPanelWidthChange) {
            onLeftPanelWidthChange(leftWidth);
        }
    }, []); // 只在组件挂载时执行一次

    // 添加全局鼠标事件监听
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // 添加鼠标样式和禁用iframe交互
    useEffect(() => {
        if (isDragging) {
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            // 禁用所有iframe的鼠标事件
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = 'none';
            });
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // 恢复iframe的鼠标事件
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = '';
            });
        }

        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // 确保清理时恢复iframe的鼠标事件
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.style.pointerEvents = '';
            });
        };
    }, [isDragging]);

    return (
        <div
            ref={containerRef}
            className={`flex gap-1 ${className}`}
            style={{ cursor: isDragging ? 'col-resize' : 'default' }}
        >
            {/* 左侧面板 */}
            <div
                className="flex-shrink-0 overflow-hidden"
                style={{
                    width: `${leftWidth}px`,
                    pointerEvents: isDragging ? 'none' : 'auto'
                }}
            >
                {leftPanel}
            </div>

            {/* 拖拽条 */}
            <div
                className={`
           flex-shrink-0 cursor-col-resize relative
           transition-all duration-200 bg-gradient-to-b 
            hover:from-transparent hover:via-green-400 hover:to-transparent
           ${isDragging ? 'from-transparent via-green-400 to-transparent' : 'from-transparent via-green-500/30 to-transparent'}
         `}
                style={{ width: `${barWidth}px` }}
                onMouseDown={handleMouseDown}
            />

            {/* 右侧面板 */}
            <div
                className="flex-1 overflow-hidden rounded-lg border-[1px] border-secondary bg-gray-700"
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            >
                {rightPanel}
            </div>
        </div>
    );
}
