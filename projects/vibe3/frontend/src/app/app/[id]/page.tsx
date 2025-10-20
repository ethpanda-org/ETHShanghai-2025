'use client'

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getApp as getAppClient, getAppFile, type AppItem, updateApp, getAppOverview } from '@/services/vibe3_api/apps';
import { getMessages } from '@/services/vibe3_api/messages';
import { Avatar } from '@/components/avatar';
import Link from 'next/link';
import {
  GradientPulse,
  CirclePulse,
} from '@/components/loading-pulse';
import { Frame } from '@/components/frame';
import { zipToFileSystemTree } from '@/uitls/files';
import { AppView } from '@/components/app-view';
import { FiCode, FiMonitor, FiRotateCw, FiDownload, FiUploadCloud, FiSettings } from "react-icons/fi";
import { FileTreeProvider, useFileTree } from '@/providers/file-tree';
import { Button } from '@/components/ui/button';
import { emitter } from '@/event_bus/emitter';
import Chat from '@/components/chat';
import { WebContainerProvider, useWebContainer } from '@/providers/web-container';
import { Input } from '@/components/ui/input';
import { exportFileTreeFromWebContainer, fileTreeToZip } from '@/uitls/files';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { UIMessage } from 'ai';
import { UIMessageMetadata } from '@/components/chat/types';
import { DialogAppSetting, type MenuItem } from '@/components/dialog_app_setting';
import { type FileSystemTree } from "@webcontainer/api";

export default function AppPage() {
  return (
    <FileTreeProvider>
      <WebContainerProvider>
        <AppContent />
      </WebContainerProvider>
    </FileTreeProvider>
  )
}

function AppContent() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { id } = useParams();
  const [app, setApp] = useState<AppItem | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(400);
  const [viewModel, setViewModel] = useState<'preview' | 'editor'>('preview');
  const { setFileTree } = useFileTree();
  const [appEdited, setAppEdited] = useState(false);
  const [previewPath, setPreviewPath] = useState('/');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { getWebContainer, previewUrl } = useWebContainer()

  const [appFileLoading, setAppFileLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [historyMessagesLoading, setHistoryMessagesLoading] = useState(false);
  const [historyMessages, setHistoryMessages] = useState<UIMessage<UIMessageMetadata>[]>([]);

  const [appSettingDialogOpen, setAppSettingDialogOpen] = useState(false);
  const [settingDialogInitialMenu, setSettingDialogInitialMenu] = useState<MenuItem>('overview');

  useEffect(() => {
    const handler = (appEdited: boolean) => {
      setAppEdited(appEdited);
    };

    const handleUpdateAppName = (appName: string) => {
      setApp(prev => prev ? { ...prev, name: appName } : null);
    };

    const handleSourceCodeOpen = (filePath: string) => {
      // 当收到 source-code 事件时，切换到编辑器视图
      setViewModel('editor');
      console.log('🔍 Source code opened:', filePath);
    };

    emitter.on('updateAppName', handleUpdateAppName);
    emitter.on('appEdited', handler);
    emitter.on('sourceCodeOpen', handleSourceCodeOpen);

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    
    return () => {
      emitter.off('appEdited', handler);
      emitter.off('updateAppName', handleUpdateAppName);
      emitter.off('sourceCodeOpen', handleSourceCodeOpen);
    };
  }, []);


  const loading = useMemo(() => {
    return authLoading || appFileLoading || historyMessagesLoading;
  }, [appFileLoading, authLoading]);

  useEffect(() => {
    if (!isAuthenticated()) {
      logout();
      location.href = '/';
    }
  }, [logout]);

  useEffect(() => {
    ; (async () => {
      if (id && isAuthenticated()) {
        setAppFileLoading(true);
        const { success, data: { app, envs } } = await getAppOverview(id as string);
        if (success) {
          setApp(app);

          const appFileBlob = await getAppFile(id as string);
          const fileTree: FileSystemTree = await zipToFileSystemTree(appFileBlob);
          if (envs.length > 0) {
            fileTree['.env'] = {
              file: {
                contents: envs.map(env => `${env.key}=${env.value}`).join('\n'),
              },
            };
          }
          setFileTree(fileTree);
        }
        setHistoryMessagesLoading(true);
        const historyMessages = await getMessages({
          appId: id as string,
          last: 10,
          orderBy: 'created_at',
          order: 'asc',
        });
        setHistoryMessages(historyMessages.map((message) => JSON.parse(message.content) as UIMessage<UIMessageMetadata>));
        setAppFileLoading(false);
        setHistoryMessagesLoading(false);
      }
    })()
  }, [id]);

  const shortId = useMemo(() => {
    if (!app) {
      return '';
    }
    return app?.id.substring(0, 4) + '...' + app?.id.substring(app?.id.length - 4);
  }, [app]);

  const downloadApp = useCallback(async () => {
    const webContainer = getWebContainer();
    if (!webContainer) {
      return;
    }

    const newFileTree = await exportFileTreeFromWebContainer(webContainer);
    const blob = await fileTreeToZip(newFileTree);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app?.name}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [app]);

  const saveApp = useCallback(async () => {
    setSaveLoading(true);
    setSaveDialogOpen(false);
    const loadingToast = toast.loading('Saving app...');
    try {
      const webContainer = getWebContainer();
      if (!webContainer) {
        return;
      }
      const newFileTree = await exportFileTreeFromWebContainer(webContainer);
      const blob = await fileTreeToZip(newFileTree);
      const response = await updateApp(id as string, blob);
      if (response.success) {
        toast.success('App saved successfully');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save app');
    } finally {
      setSaveLoading(false);
      toast.dismiss(loadingToast);
    }
  }, [id]);

  useEffect(() => {
    const handleAutoSaveApp = () => {
      saveApp();
    };
    emitter.on('autoSaveApp', handleAutoSaveApp);
    return () => {
      emitter.off('autoSaveApp', handleAutoSaveApp);
    };
  }, []);

  const showSettingDialog = useCallback((initialMenu: MenuItem) => {
    setSettingDialogInitialMenu(initialMenu);
    setAppSettingDialogOpen(true);
  }, [setAppSettingDialogOpen, setSettingDialogInitialMenu]);

  return (
    <div className="flex flex-col items-center h-screen font-sans bg-background text-foreground">
      <div className="header flex flex-row items-center w-full mx-auto py-4 px-6">

        <div className="flex flex-row items-center gap-6" style={{ minWidth: `${leftPanelWidth}px` }}>
          <Link href="/" className="text-xl font-bold text-green-400">[ Vibe3 ]</Link>
          {!loading ?
            <div className='flex flex-row items-center gap-2'>
              <div className='flex flex-col'>
                <div className="text-xs font-bold">{app?.name}</div>
                <div className="text-xs text-muted-foreground opacity-50 font-mono">ID: {shortId}</div>
              </div>
            </div> : <GradientPulse width={200} height={32} />
          }
        </div>
        <div className="flex-1 flex justify-between">
          <div className="flex flex-row items-center gap-2">
            <div className='bg-input/30 flex flex-row items-center gap-2 border-input border rounded-md p-[3px]'>
              <div className={`py-1 px-2 rounded cursor-pointer ${viewModel === 'editor' ? 'bg-green-500 text-background' : 'text-gray-500'}`}
                onClick={() => setViewModel('editor')}>
                <FiCode />
              </div>
              <div className={`py-1 px-2 rounded cursor-pointer ${viewModel === 'preview' ? 'bg-green-500 text-background' : 'text-gray-500'}`}
                onClick={() => setViewModel('preview')}>
                <FiMonitor />
              </div>
            </div>


            {viewModel === 'editor' &&
              <div className='flex flex-row items-center gap-2'>
                <Button
                  disabled={!appEdited} variant='outline' size='sm' onClick={() => {
                    emitter.emit('discardApp');
                  }}>Discard</Button>
                <Button disabled={!appEdited} variant='outline' size='sm' className='text-green-500' onClick={() => {
                  emitter.emit('saveManualEdit');
                }}>Save</Button>
              </div>
            }
            {
              viewModel === 'preview' && <div className='flex flex-row items-center'>
                <Input type='text'
                  className='!ring-0 !bg-transparent h-[32px] border-input'
                  placeholder='Enter route path'
                  value={previewPath}
                  onChange={(e) => {
                    setPreviewPath(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      emitter.emit('previewPathChange', e.currentTarget.value);
                    }
                  }} />
                <Button variant='ghost' size='sm' className='text-gray-500 rounded-full cursor-pointer' onClick={() => {
                  emitter.emit('refreshApp');
                }}>
                  <FiRotateCw size={16} />
                </Button>
              </div>
            }
          </div>
          {
            loading
              ? <CirclePulse size={32} />
              : <div className='flex flex-row items-center gap-2'>
                <Button disabled={!previewUrl} variant='outline' size='sm' className='text-green-500' onClick={() => {
                  showSettingDialog("overview");
                }}>
                  <FiSettings size={16} />
                </Button>
                <Button variant='outline' size='sm' className='!text-green-500  cursor-pointer'
                  disabled={!previewUrl} onClick={downloadApp}>
                  <FiDownload size={16} />
                </Button>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant='outline' size='sm'
                      className='!text-green-500 cursor-pointer'
                      disabled={saveLoading || !previewUrl}>
                      <FiUploadCloud size={16} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save App</DialogTitle>
                      <DialogDescription>
                        Do you want to save the app?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant='outline' size='sm'
                        className='cursor-pointer text-gray-500' onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant='outline' size='sm'
                        className='!text-green-500 cursor-pointer' onClick={saveApp}>
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant='default' size='sm' disabled={!previewUrl}
                  className='cursor-pointer  bg-green-500 text-background hover:!bg-green-500/80'
                  onClick={() => {
                    showSettingDialog("publish");
                  }}>
                  Publish
                </Button>

                <Avatar name={user?.nickname || user?.email || 'User'} size="sm" url={user?.avatar} />
              </div>
          }
        </div>
        <DialogAppSetting
          appId={app?.id as string}
          open={appSettingDialogOpen}
          onOpenChange={setAppSettingDialogOpen}
          initialMenu={settingDialogInitialMenu}
        />
      </div>

      <Frame
        className='w-full flex-1 overflow-hidden p-3 pt-0'
        defaultLeftWidth={leftPanelWidth}
        onLeftPanelWidthChange={setLeftPanelWidth}
        leftPanel={
          !loading && !!app ? <Chat appId={app?.id as string} historyMessages={historyMessages} /> : null
        }
        rightPanel={
          <AppView model={viewModel} />
        }
      />

    </div>
  );
}
