import { Preview } from './preview';
import { SandboxStatus } from './webcontainer-status';
import { useMemo, useEffect } from 'react';
import { useWebContainer } from '@/providers/web-container';
import Editor from './editor/editor';
import { useFileTree } from '@/providers/file-tree';
import { stripOutput } from '@/uitls/output';
import { mountUint8ArrayFilesFromFileTree} from '@/uitls/files';
import { FileSystemTree, type WebContainer } from '@webcontainer/api';

export interface AppViewProps {
    model?: 'preview' | 'editor';
}

export function AppView({ model = "preview" }: AppViewProps) {
    const { fileTree } = useFileTree();
    const { status, getWebContainer, error: webContainerError, previewUrl, setRuntimeError, setStatus } = useWebContainer();

    // 设置WebContainer的逻辑
    useEffect(() => {
        const setupWebContainer = async (fileTree: FileSystemTree, webContainer: WebContainer) => {
            try {
                console.time('mount file tree to webcontainer');
                console.log('[webcontainer] Setting up WebContainer with file tree...');
                await webContainer.mount(fileTree);
                // we need to mount uint8array files from file tree additionally,
                // because some file like png file will broken when use webContainer.mount(),
                // but use fs.writeFile() will be ok
                await mountUint8ArrayFilesFromFileTree(fileTree, webContainer);

                // console.log('[webcontainer] fetch depts...');
                setStatus('deps-installing');
                console.log('[webcontainer] Running npm install...');

                const installProcess = await webContainer.spawn('npm', ['ci']);
                // pipe the output to console
                installProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        console.log(data);
                    }
                }));
    
                const installExitCode = await installProcess.exit;
                if (installExitCode !== 0) {
                    throw new Error('[webcontainer] Unable to run npm install');
                }
               
                setStatus('deps-installed');
                console.log('[webcontainer] npm install completed successfully');
                setStatus('server-starting');
                console.log('[webcontainer] Starting development server...');
                console.timeEnd('mount file tree to webcontainer');
                const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
                devProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        console.log(data);
                        const viteErrorRegex = /.*\[vite\].*error:/i;
                        const syntaxErrorRegex = /.*SyntaxError:/i;
                        const uncaughtErrorRegex = /.*Uncaught/i;
                        if (viteErrorRegex.test(data) || syntaxErrorRegex.test(data) || uncaughtErrorRegex.test(data)) {
                            const errorMessage = stripOutput(data).split('    at ')[0].trim();
                            setRuntimeError(errorMessage);
                        } else {
                            setRuntimeError(null);
                        }
                    }
                }));
                webContainer.on('server-ready', (port, url) => {
                    setStatus('server-started');
                    console.log('[webcontainer] Development server started');
                });
            } catch (error) {
                console.error('[webcontainer] Error setting up WebContainer:', error);
                setStatus('error');
            }
        };

        const webContainer = getWebContainer();
        if (fileTree && webContainer && status === 'booted') {
            setupWebContainer(fileTree, webContainer);
        }
    }, [status, setStatus, getWebContainer, fileTree]);

    // 显示 WebContainer 错误
    useEffect(() => {
        if (webContainerError) {
            console.error('WebContainer error:', webContainerError);
            // 这里可以显示错误提示给用户
        }
    }, [webContainerError]);

    const viewModel = useMemo(() => {
        return model;
    }, [model]);

    // 如果WebContainer还没有准备好或者没有文件树，显示加载状态
    if (!previewUrl) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <SandboxStatus />
                </div>
            </div>
        );
    }

    // 使用 display: none 的方式控制视图显示，避免重新渲染
    return (
        <div className="w-full h-full relative">
            {/* Preview 视图 */}
            <div
                className={`w-full h-full absolute inset-0 ${viewModel === 'preview' ? '' : 'hidden'}`}
            >
                <Preview previewUrl={previewUrl} />
            </div>

            {/* Editor 视图 */}
            <div
                className={`w-full h-full absolute inset-0 ${viewModel === 'editor' ? '' : 'hidden'}`}
            >
                <Editor />
            </div>
        </div>
    );
}