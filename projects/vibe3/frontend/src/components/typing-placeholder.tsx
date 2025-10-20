import { useState, useEffect } from 'react';

interface TypingPlaceholderProps {
    texts: string[];
    interval?: number; // 每个文本播放的间隔时间（毫秒）
    typingSpeed?: number; // 打字速度（毫秒）
    pauseTime?: number; // 每个文本播放完后的暂停时间（毫秒）
}

export default function TypingPlaceholder({ 
    texts, 
    interval = 5000, // 默认5秒
    typingSpeed = 100, // 默认100ms每个字符
    pauseTime = 1000 // 默认1秒暂停
}: TypingPlaceholderProps) {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentText = texts[currentTextIndex];
        
        if (!currentText) return;

        let timeout: NodeJS.Timeout;

        if (isTyping && !isDeleting) {
            // 打字阶段
            if (displayedText.length < currentText.length) {
                timeout = setTimeout(() => {
                    setDisplayedText(currentText.slice(0, displayedText.length + 1));
                }, typingSpeed);
            } else {
                // 打字完成，等待暂停时间后开始删除
                timeout = setTimeout(() => {
                    setIsDeleting(true);
                }, pauseTime);
            }
        } else if (isDeleting) {
            // 删除阶段
            if (displayedText.length > 0) {
                timeout = setTimeout(() => {
                    setDisplayedText(displayedText.slice(0, -1));
                }, typingSpeed / 2); // 删除速度比打字快
            } else {
                // 删除完成，切换到下一个文本
                setIsDeleting(false);
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
            }
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [displayedText, isTyping, isDeleting, currentTextIndex, texts, typingSpeed, pauseTime]);

    return (
        <span className="text-muted-foreground">
            {displayedText}
            <span className="animate-pulse">|</span>
        </span>
    );
}
