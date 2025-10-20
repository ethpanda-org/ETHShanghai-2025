import { useMemo, useState } from 'react';
import { FiArrowUp } from "react-icons/fi";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import TypingPlaceholder from "./typing-placeholder";
import { createApp } from '@/services/vibe3_api/apps';
import { useAuth } from '@/hooks/useAuth';
import { FiImage } from "react-icons/fi";
import { FileItem } from './chat/FileItem';
import { toast } from 'sonner';

interface PromptInputProps {
    placeholderTexts?: string[]; // 用于打字效果的文本数组
}

export default function HomePromptInput({
    placeholderTexts,
}: PromptInputProps) {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { isAuthenticated } = useAuth();
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<{ url: string, name: string }[]>([]);

    const uploadCompleted = useMemo(() => {
        return uploadedFiles.length === files.length;
    }, [uploadedFiles, files]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (selectedFiles) {
            const newFiles = Array.from(selectedFiles);
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
    };

    const handleUploadClick = () => {
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        fileInput?.click();
    };

    const handleRemoveFile = (name: string) => {
        setFiles(prevFiles => prevFiles.filter(file => file.name !== name));
        setUploadedFiles(prevFiles => prevFiles.filter(file => file.name !== name));
    };

    const handleUploadComplete = (url: string, name: string) => {
        setUploadedFiles(prevFiles => [...prevFiles, { url, name }]);
    };

    const handleSend = async () => {
        if (isLoading) return;
        if (!input.trim()) return;

        if (!isAuthenticated()) {
            location.href = '/login';
            return;
        }

        if (!uploadCompleted) {
            toast.info('Please wait for all files to be uploaded');
            return;
        }

        setIsLoading(true);
        try {
            const response = await createApp('My App', '');
            let attachedFilesQuery = '';
            if (uploadedFiles.length > 0) {
                const filesNames = uploadedFiles.map(file => file.name);
                const filesUrls = uploadedFiles.map(file => file.url);
                attachedFilesQuery = `files=${filesNames.map(name => encodeURIComponent(name)).join(',')}&files_urls=${filesUrls.map(url => encodeURIComponent(url)).join(',')}`;
            }
            if (response.success) {
                location.href = `/app/${response.data.id}?prompt=${encodeURIComponent(input)}${attachedFilesQuery ? `&${attachedFilesQuery}` : ''}`;
            } else {
                console.error(response.message);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // 检查是否为图片类型
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // 为粘贴的图片生成有意义的文件名
                    const timestamp = new Date().getTime();
                    const extension = item.type.split('/')[1] || 'png';
                    const fileName = `image-${timestamp}.${extension}`;
                    
                    // 创建新的 File 对象，使用自定义文件名
                    const renamedFile = new File([file], fileName, {
                        type: file.type,
                        lastModified: file.lastModified
                    });
                    
                    imageFiles.push(renamedFile);
                }
            }
        }

        // 如果有图片文件，添加到 files 状态
        if (imageFiles.length > 0) {
            setFiles(prevFiles => [...prevFiles, ...imageFiles]);
        }
    };

    return (
        <div className='w-full p-[2px] rounded-xl bg-gradient-to-r from-green-400 to-muted-foreground'>
            <div role="prompt-input" className={`w-full p-3 border ${isLoading ? '!bg-muted-foreground/30' : '!bg-card'} rounded-xl border-primary/20`}>
                <div className='flex gap-2 flex-col'>
                    <div className='flex-1 relative'>
                        <Textarea
                            style={{ resize: 'none' }}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            disabled={isLoading}
                            className='max-h-[120px] !text-base !border-0 !ring-0 !bg-transparent shadow-none'
                        />
                        {placeholderTexts && !input && (
                            <div className='absolute top-3 left-3 pointer-events-none'>
                                <TypingPlaceholder texts={placeholderTexts} />
                            </div>
                        )}
                        {
                            files.length > 0 && (
                                <div className='mt-2 flex flex-wrap gap-2'>
                                    {files.map((file, index) => (
                                        <FileItem key={index} file={file} onRemove={() => handleRemoveFile(file.name)} onUploadComplete={(url) => {
                                            handleUploadComplete(url, file.name);
                                        }} />
                                    ))}
                                </div>
                            )
                        }
                    </div>

                    <div className='flex flex-row gap-2 justify-end'>
                        <Button
                            disabled={isLoading}
                            size="icon"
                            variant='ghost'
                            title='Upload Image'
                            className='h-8 w-8 shrink-0 self-end rounded-full cursor-pointer text-green-500/80 hover:text-green-500'
                            onClick={handleUploadClick}>
                            <FiImage />
                        </Button>
                        <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        {(isLoading || !uploadCompleted)
                            ? <Button
                                disabled={true}
                                size="icon"
                                variant='outline'
                                className='h-8 w-8 shrink-0 self-end rounded-full'>
                                <div className='w-4 h-4 bg-gray-500 rounded animate-pulse' />
                            </Button>
                            : <Button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                size="icon"
                                variant='outline'
                                className='h-8 w-8 shrink-0 self-end rounded-full'>
                                <FiArrowUp />
                            </Button>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
