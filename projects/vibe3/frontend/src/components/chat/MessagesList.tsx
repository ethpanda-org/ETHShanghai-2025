import { forwardRef, useEffect, useRef } from 'react';

interface MessagesListProps {
    chatStatus: string;
    children: React.ReactNode;
    enableAutoScroll?: boolean;
    autoScrollThreshold?: number;
}

export const MessagesList = forwardRef<HTMLDivElement, MessagesListProps>(
    ({ children,
        chatStatus,
        enableAutoScroll = true,
    }, ref) => {
        // 自动滚动逻辑
        const intervalRef = useRef<NodeJS.Timeout | null>(null);
        const containerRef = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            if (!enableAutoScroll) return;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            if (chatStatus === 'streaming' || chatStatus === "submitted") {
                intervalRef.current = setInterval(() => {
                    if (!containerRef.current) return;
                    containerRef.current.scrollTop = 10000000;
                }, 100);
            }

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        }, [chatStatus, enableAutoScroll, ref]);

        useEffect(() => {
            setTimeout(() => {
                if (!containerRef.current) return;
                containerRef.current.scrollTop = 10000000;
            }, 500);
        }, []);

        return (
            <div
                ref={containerRef}
                role='messages'
                className='flex-1 overflow-y-auto flex flex-col gap-6 relative'
            >
                {children}
            </div>
        );
    }
);

MessagesList.displayName = 'MessagesList';
