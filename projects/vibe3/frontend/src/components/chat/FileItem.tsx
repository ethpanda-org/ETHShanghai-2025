import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { upload } from '@/services/vibe3_api/files';

interface FileItemProps {
  file: File;
  onRemove: () => void;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export function FileItem({ file, onRemove, onUploadComplete, onUploadError }: FileItemProps) {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isError, setIsError] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const uploadPromiseRef = useRef<Promise<any> | null>(null);
  const hasStartedUploadRef = useRef(false); // 防止重复上传的标记

  useEffect(() => {
    // 如果已经开始上传或已完成/出错，则不再重复上传
    if (hasStartedUploadRef.current || isCompleted || isError) {
      return;
    }

    // 开始上传
    const startUpload = async () => {
      try {
        hasStartedUploadRef.current = true;
        setIsUploading(true);
        setIsError(false);

        // 开始进度条动画
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              return prev; // 在90%时停止增加
            }
            return Math.min(prev + 10, 90);
          });
        }, 1000);

        // 执行上传
        const filename = file.name;
        uploadPromiseRef.current = upload(file, filename);
        const result = await uploadPromiseRef.current;

        if (result.success) {
          // 上传成功，立即到100%
          clearInterval(progressIntervalRef.current!);
          setProgress(100);
          setIsCompleted(true);
          setIsUploading(false);
          onUploadComplete?.(result.data?.url || '');
        } else {
          // 上传失败
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        // 上传失败，进度条归0
        clearInterval(progressIntervalRef.current!);
        setProgress(0);
        setIsError(true);
        setIsUploading(false);
        onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
      }
    };

    startUpload();

    // 清理函数
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // 注意：不在这里清理 hasStartedUploadRef，因为组件可能只是重新渲染而不是卸载
    };
  }, [file, onUploadComplete, onUploadError, isCompleted, isError]);

  // 重新上传功能
  const retryUpload = () => {
    if (isUploading) return; // 如果正在上传，则不允许重试
    
    // 重置状态
    hasStartedUploadRef.current = false;
    setIsError(false);
    setIsCompleted(false);
    setProgress(0);
    
    // 重新触发上传
    const startUpload = async () => {
      try {
        hasStartedUploadRef.current = true;
        setIsUploading(true);

        // 开始进度条动画
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              return prev;
            }
            return Math.min(prev + 10, 90);
          });
        }, 1000);

        // 执行上传
        const filename = file.name;
        uploadPromiseRef.current = upload(file, filename);
        const result = await uploadPromiseRef.current;

        if (result.success) {
          clearInterval(progressIntervalRef.current!);
          setProgress(100);
          setIsCompleted(true);
          setIsUploading(false);
          onUploadComplete?.(result.data?.url || '');
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        clearInterval(progressIntervalRef.current!);
        setProgress(0);
        setIsError(true);
        setIsUploading(false);
        onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
      }
    };

    startUpload();
  };

  const getStatusColor = () => {
    if (isError) return 'text-red-600';
    if (isCompleted) return 'text-green-100';
    return 'text-green-600';
  };

  const getProgressBarColor = () => {
    if (isError) return 'bg-red-500';
    return 'bg-green-900';
  };

  const getStatusText = () => {
    if (isError) return 'upload failed';
    if (isCompleted) return 'upload completed';
    if (isUploading) return 'uploading...';
    return 'uploading...';
  };

  return (
    <div className='flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm relative overflow-hidden'>

      {/* 进度条 */}
      <div className='absolute inset-0 bg-muted'>
        <div
          className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 内容层 */}
      <div className='relative z-10 flex items-center gap-1 w-full'>
        <span className={`text-xs ${getStatusColor()} flex-1 truncate`}>
          {file.name}
        </span>
        {isError && (
          <button
            onClick={retryUpload}
            className='text-xs text-blue-600 hover:text-blue-800 underline mr-1'
            title='重新上传'
          >
            重试
          </button>
        )}
        <button
          onClick={onRemove}
          className={`${getStatusColor()} hover:opacity-80 transition-opacity flex-shrink-0`}
          title={getStatusText()}
        >
          <FiX size={12} />
        </button>
      </div>
    </div>
  );
}
