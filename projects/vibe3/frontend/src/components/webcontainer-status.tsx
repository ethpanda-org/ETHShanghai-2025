import { useMemo } from 'react';
import { useWebContainer } from '@/providers/web-container';

export function SandboxStatus() {
  const { status, error: webContainerError } = useWebContainer();
  
  const text = useMemo(() => {
    if (webContainerError) {
      return webContainerError.message;
    } else if (status === 'booting' || status === 'booted') {
      return 'Booting WebContainer...';
    } else if (status === 'deps-installing') {
      return 'Installing dependencies...';
    } else if (status === 'deps-installed') {
      return 'WebContainer ready';
    } else if (status === 'server-starting') {
      return 'Starting server...';
    } else if (status === 'server-started') {
      return 'WebContainer ready';
    } else {
      return 'Booting WebContainer error';
    }
  }, [status, webContainerError]);

  if (webContainerError) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 text-sm">
          <div className="font-semibold">WebContainer initialization failed</div>
          <div className="text-xs mt-1">{webContainerError.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center gap-3 flex-col">
        <span className="text-sm text-gray-500">{text}</span>
        <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden relative">
          <div className="h-full bg-green-500 rounded-full animate-progress-bar absolute left-1/2 transform -translate-x-1/2"></div>
        </div>
      </div>
    </div>
  );
}
