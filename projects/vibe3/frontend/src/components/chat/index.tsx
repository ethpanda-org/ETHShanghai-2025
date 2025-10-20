import { useState, useEffect, useMemo } from 'react';
import { FiArrowUp, FiTool, FiXCircle, FiX, FiImage } from "react-icons/fi";
import { LuMousePointerClick } from "react-icons/lu";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useChat } from '@ai-sdk/react';
import { MessagesList } from './MessagesList';
import { useFileTree } from '@/providers/file-tree';
import { lastAssistantMessageIsCompleteWithToolCalls, DefaultChatTransport, generateId, type UIMessage, createIdGenerator } from 'ai';
import { resolveModifyAction } from './utils/modify';
import { resolveReadFiles, resolveReadDirectory } from './utils/read';
import { MessageItem } from './MessageItem';
import { FileItem } from './FileItem';
import { useSearchParams } from 'next/navigation';
import { useWebContainer } from '@/providers/web-container';
import { reportError } from '@/services/error_report';
import { exportFileTreeFromWebContainer, exportRootDirectoryFilePaths, filePathsToMarkdownTable } from '@/uitls/files';
import * as git from './utils/git';
import { stripOutput } from '@/uitls/output';
import { resolveNpmInstall } from './utils/npm';
import { appendMessage } from '@/services/vibe3_api/messages';
import { SendMessagesRequestParams, UIMessageMetadata } from './types';
import { tokenManager } from '@/services/vibe3_api/auth';
import { emitter } from '@/event_bus/emitter';
import { handleInstantdbToolCall } from '@/services/instantdb_api/tools';
import { INSTANTDB_SYSTEM_PROMPT, ADDITIONAL_CRITICAL_RULES } from './prompt_v1';
import { toast } from 'sonner';
import { ReferenceCodeLineItem } from './reference_code_line_item';
import { switchInspectorMode } from './utils/inspector';

export default function Chat({ appId, historyMessages }: { appId: string, historyMessages: UIMessage<UIMessageMetadata>[] }) {
    const searchParams = useSearchParams();
    const prompt = searchParams.get('prompt');
    const attachedFiles = searchParams.get('files');
    const attachedFilesUrls = searchParams.get('files_urls');

    const initialFiles = () => {
        const filesAndUrls = [] as { name: string, url: string }[];
        if (attachedFiles && attachedFilesUrls) {
            const files = attachedFiles.split(',');
            const urls = attachedFilesUrls?.split(',');
            if (files.length !== urls?.length) {
                return []
            }

            files.forEach((file, index) => {
                filesAndUrls.push({ name: file, url: urls?.[index] || '' });
            });
        }
        return filesAndUrls;
    }

    const { previewUrl, getWebContainer, setRuntimeError, runtimeError } = useWebContainer();
    const { fileTree, setFileTree } = useFileTree();
    const [chatError, setChatError] = useState<Error | null>();
    const [clientChatId, setClientChatId] = useState<string>(generateId());

    const [input, setInput] = useState('');
    const [FinishedMessageId, setFinishedMessageId] = useState<string | null>(null);
    const [isModified, setIsModified] = useState(false);
    const [msgCommitHashMap, setMsgCommitHashMap] = useState<{ msgId: string, commitHash: string }[]>([]);
    const [gitInited, setGitInited] = useState(false);
    const [selectedPaths, setSelectedPaths] = useState<string[]>(['./src/App.tsx']);
    const [focusPath, setFocusPath] = useState<string>('./src/App.tsx');
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<{ url: string, name: string }[]>(initialFiles());
    const [referenceCodeLine, setReferenceCodeLine] = useState<string | null>(null);
    const [isInspectorMode, setIsInspectorMode] = useState<boolean>(false);
    const [inspectorLoading, setInspectorLoading] = useState<boolean>(false);

    const uploadCompleted = useMemo(() => {
        return uploadedFiles.length >= files.length;
    }, [uploadedFiles, files]);

    useEffect(() => {
        // listen vibe3 inspector action
        const handleVibe3InspectorAction = (event: MessageEvent) => {
            if (event.data.source !== 'vite-plugin-vibe3-inspector') {
                return;
            }
            if (event.data.action === 'reference') {
                const info = event.data.info;
                if (info) {
                    // info 格式: "path/to/file.tsx:line:column"
                    setReferenceCodeLine(info);
                }
            }
        };
        window.addEventListener('message', handleVibe3InspectorAction);
        return () => {
            window.removeEventListener('message', handleVibe3InspectorAction);
        };
    }, []);

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

    const handleChatError = (error: Error) => {
        setChatError(error);
        reportError(error, 'chat-client');
    }

    const { messages, sendMessage, stop, status, addToolResult } = useChat<UIMessage<UIMessageMetadata>>({
        id: clientChatId,
        messages: historyMessages,
        transport: new DefaultChatTransport({
            prepareSendMessagesRequest: (params): SendMessagesRequestParams => {
                const token = tokenManager.getToken();
                if (!token) {
                    throw new Error('No authentication token available');
                }

                // ONLY send the last 6 messages to LLM.
                // Maybe we will have a better way to manage the large context in the future.
                let messagesToSend = []
                if (params.messages.length > 6) {
                    messagesToSend = params.messages.slice(-6);
                } else {
                    messagesToSend = params.messages
                }

                return {
                    headers: {
                        Authorization: token
                    },
                    body: {
                        appid: appId,
                        client_chatid: clientChatId,
                        messages: messagesToSend,
                    }
                }
            }
        }),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        async onToolCall({ toolCall }: any) {
            if (toolCall.dynamic) {
                return;
            }

            if (toolCall.toolName.includes('instantdb_')) {
                const webContainer = getWebContainer()!;
                const res = await handleInstantdbToolCall(toolCall, webContainer, appId);
                addToolResult({
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    output: { type: toolCall.toolName, result: res },
                });
                return;
            }

            if (toolCall.toolName === 'npm_install') {
                const result = await resolveNpmInstall({ type: toolCall.toolName, ...toolCall.input },
                    getWebContainer()!);
                console.log('npm install result =>', result);
                addToolResult({
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    output: { type: toolCall.toolName, ...toolCall.input, result },
                });
                return;
            }

            if (toolCall.toolName === 'check_action_linting') {
                const result = await handleLinting(toolCall.input.paths);
                addToolResult({
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    output: { type: toolCall.toolName, ...toolCall.input, result },
                });
            }
            
            if (toolCall.toolName.includes('modify_action_')) {
                await resolveModifyAction({ type: toolCall.toolName, ...toolCall.input }, getWebContainer()!);
                setIsModified(true);
                addToolResult({
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    output: { type: toolCall.toolName, success: true },
                });
            } else if (toolCall.toolName === 'read_action_files') {
                const result = await resolveReadFiles({ type: toolCall.toolName, ...toolCall.input }, getWebContainer()!);
                addToolResult({
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    output: { type: toolCall.toolName, ...result },
                });
            } else if (toolCall.toolName === 'read_action_directory') {
                const result = await resolveReadDirectory({ type: toolCall.toolName, ...toolCall.input }, getWebContainer()!);
                addToolResult({
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId,
                    output: { type: toolCall.toolName, ...toolCall.input, ...result },
                });
            }

        },
        onError: handleChatError,
        onFinish: async ({ message, isAbort, isDisconnect, isError }) => {
            console.log(`[vibe3]: onFinish called`);
            const isFinished = message.parts.some((part) => part.type === 'text' && part.text.includes('***finished***'));
            if ((isFinished || isAbort || isDisconnect || isError) && message.parts.length > 0) {
                // save the the assistant message
                await appendMessage({
                    appId: appId,
                    clientChatId,
                    content: message,
                    clientMessageId: message.id,
                    model: message.metadata?.model || ''
                });
                setFinishedMessageId(message.id);
            }
        }
    });

    useEffect(() => {
        const handleFinish = async () => {
            if (FinishedMessageId) {
                if (isModified) {
                    console.log('[vibe3]: git 提交改动...');
                    const webContainer = getWebContainer()!;
                    await git.resolveGitAdd(webContainer);
                    const commitHash = await git.resolveGitCommit(webContainer);
                    console.log('[vibe3]: Git 提交成功，哈希值为 =>', commitHash);
                    setMsgCommitHashMap((prev) => [...prev, { msgId: FinishedMessageId, commitHash }]);
                    setIsModified(false);
                    emitter.emit('appEdited', true);
                    emitter.emit('autoSaveApp');
                }
                const newFileTree = await exportFileTreeFromWebContainer(getWebContainer()!);
                console.log('[vibe3]: new file tree exported =>', newFileTree);
                setFileTree(newFileTree);
                setFinishedMessageId(null);
            }
        }

        handleFinish()
    }, [FinishedMessageId, isModified, status]);

    useEffect(() => {
        const handlerEditorTabChange = ({ focus, opened }: { focus: string, opened: string[] }) => {
            setSelectedPaths(opened);
            setFocusPath(focus);
        }
        emitter.on('editorTabChange', handlerEditorTabChange);
        return () => {
            emitter.off('editorTabChange', handlerEditorTabChange);
        };
    }, []);

    const handleSend = async (prompt?: string) => {
        const forcusFilePaths = [focusPath].map(path => ({ path, isDirectory: false }));
        const selectedFilePaths = selectedPaths.map(path => ({ path, isDirectory: false }));

        if (!uploadCompleted) {
            toast.info('Please wait for all files to be uploaded');
            return;
        }

        const attachedFiles = uploadedFiles.length === 0
            ? 'No attached files'
            : `${uploadedFiles.map(file => `[${file.name}](${file.url})\n`)}
        `;

        const fixedPrompt = `
        ***User Prompt***
        ${prompt || input}

        ***Focused Tab***
        ${referenceCodeLine || filePathsToMarkdownTable(forcusFilePaths)}

        ***Opened Tabs***
        ${filePathsToMarkdownTable(selectedFilePaths)}

        ***Attached Files***
        ${attachedFiles}
        
        ***InstantDB Documentation***
        ${INSTANTDB_SYSTEM_PROMPT}
        ${ADDITIONAL_CRITICAL_RULES}
        `
        sendMessage({ text: fixedPrompt });
        setInput('');
        setUploadedFiles([]);
        setFiles([]);
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

    const handleInitLocalGitRepo = async () => {
        try {
            const webContainer = getWebContainer();
            if (!webContainer) {
                throw new Error('[webcontainer] WebContainer not found');
            }
            await git.resolveGitInit(webContainer);
            await git.resolveGitAdd(webContainer);
            const commitHash = await git.resolveGitCommit(webContainer);
            setMsgCommitHashMap((prev) => [...prev, { msgId: '0', commitHash }]);
            // handleLinting();
        } finally {
            setGitInited(true);
        }
    }

    useEffect(() => {
        // send first message
        if (previewUrl && !gitInited) {
            handleInitLocalGitRepo();
            if (prompt) {
                handleSend(prompt)
                // clean query params and uploaded files
                history.replaceState(null, '', window.location.pathname);
            }
        }
    }, [previewUrl, prompt, gitInited]);

    const handleCheckoutToSpecificCommit = async (commitHash: string) => {
        const webContainer = getWebContainer();
        if (!webContainer) {
            throw new Error('[webcontainer] WebContainer not found');
        }
        await git.resolveGitCheckoutToSpecificCommit(webContainer, commitHash);
        const newFileTree = await exportFileTreeFromWebContainer(webContainer);
        console.log('[vibe3]: new file tree exported =>', newFileTree);
        setFileTree(newFileTree);
    }

    const handleLinting = async (paths?: string[]): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`[vibe3]: Linting ${paths?.join(', ') || 'all'} ...`);
                const webContainer = getWebContainer();
                if (!webContainer) {
                    throw new Error('[webcontainer] WebContainer not found');
                }
                const lintProcess = await webContainer.spawn('npm', ['run', 'lint', ...(paths || [])]);
                let output = '';
                lintProcess.output.pipeTo(new WritableStream({
                    write(data) {
                        output += data;
                    }
                }));
                await lintProcess.exit;
                const cleanedOutput = stripOutput(output);
                console.log('[vibe3]: Linting successfully =>', cleanedOutput);
                resolve(cleanedOutput);
            } catch (error) {
                reject(error);
            }
        })
    }

    const handleFixRuntimeError = async () => {
        const codefilePaths = await exportRootDirectoryFilePaths(getWebContainer()!, '.');
        const prompt = `
        Fix the issue
        
        ***Runtime Error***
        ${runtimeError}

        ***Codebase Root Directory Paths***
        ${filePathsToMarkdownTable(codefilePaths)}
        `;
        sendMessage({ text: prompt });
        setRuntimeError(null);
    }

    const handleSwitchInspectorMode = async () => {
        const webContainer = getWebContainer();
        if (!webContainer) {
            toast.error('WebContainer not available');
            return;
        }
        setInspectorLoading(true)
        const newMode = !isInspectorMode;
        await switchInspectorMode(newMode, webContainer);
        const newFileTree = await exportFileTreeFromWebContainer(webContainer);
        setFileTree(newFileTree);
        setInspectorLoading(false)
        setIsInspectorMode(newMode);
    }

    return (
        <div className='w-full h-full flex flex-col gap-2'>
            <MessagesList
                chatStatus={status}
                enableAutoScroll={true}
                autoScrollThreshold={150}>
                {(!previewUrl && !historyMessages.length) && (
                    <div className='flex flex-1 justify-center items-center text-muted-foreground'>
                        Installing dependencies...
                    </div>
                )}
                {messages.map((message: UIMessage<UIMessageMetadata>) => {
                    return <MessageItem
                        onUndo={handleCheckoutToSpecificCommit}
                        onRedo={handleCheckoutToSpecificCommit}
                        chatStatus={status}
                        msgCommitHashMap={msgCommitHashMap}
                        message={message}
                        key={message.id}
                    />
                })}

            </MessagesList>
            {(status === 'submitted' || status === 'streaming') && (
                <div className='pointer-events-none flex justify-center items-center p-2 w-full bg-gradient-to-b from-transparent via-transparent to-background -mt-10 relative z-10'>
                    <img src="/pending-animation.svg" alt="123" width={50} />
                </div>
            )}

            {!!chatError && <div className='flex flex-row gap-2'>
                <div className='bg-card w-full flex flex-1 flex-row gap-2 p-3 border-red-500/50 border rounded-lg m-1 mb-2'>
                    <div className='text-red-600 flex-1'>{chatError.message}</div>
                    <FiXCircle size={24} className='flex-shrink-0  text-red-600 cursor-pointer' onClick={() => setChatError(null)} />
                </div>
            </div>}

            {!!runtimeError && status === 'ready' && <div className='flex flex-row gap-2'>
                <div className='bg-red-800/10 w-full flex flex-1 flex-row gap-1 p-1 border-red-500/40 border rounded-lg m-1 mb-2 items-center'>
                    <div className='text-red-600 flex-1 pl-1 text-sm font-semibold'>Runtime Error Found</div>
                    <Button size='icon' variant='outline' className='h-8 w-8 shrink-0 self-end cursor-pointer text-red-600/60 text-sm' onClick={() => setRuntimeError(null)}>
                        <FiX />
                    </Button>
                    <Button size='icon' variant='outline' className='h-8 w-8 shrink-0 self-end cursor-pointer text-green-500/60 text-sm' onClick={handleFixRuntimeError}>
                        <FiTool />
                    </Button>
                </div>
            </div>}

            <div role='input'
                className='w-full p-[2px] border border-muted bg-gradient-to-r from-green-400 to-muted-foreground rounded-xl relative'>
                <div className='flex gap-2 flex-col bg-card rounded-xl p-3'>
                    <div className='flex-1'>
                        <Textarea
                            disabled={!previewUrl || !gitInited}
                            style={{ resize: 'none' }}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder="Send your ideas..."
                            className='max-h-[120px] !text-base !border-0 !ring-0 !bg-transparent shadow-none'
                        />
                        {<div className='mt-2 flex flex-wrap gap-2'>
                            {files.map((file, index) => (
                                <FileItem
                                    key={index}
                                    file={file}
                                    onRemove={() => handleRemoveFile(file.name)}
                                    onUploadComplete={(url) => {
                                        handleUploadComplete(url, file.name);
                                    }}
                                    onUploadError={(error) => {
                                        console.error('File upload failed:', error);
                                    }} />)
                            )}
                            {!!referenceCodeLine &&
                                <ReferenceCodeLineItem
                                    referenceCodeLine={referenceCodeLine}
                                    onRemove={() => setReferenceCodeLine(null)} />}
                        </div>}
                    </div>
                    <div className='flex flex-row gap-1 justify-end'>
                        <Button
                            disabled={status === 'streaming' || status === 'submitted' || !gitInited || inspectorLoading}
                            size="icon"
                            variant='ghost'
                            title={isInspectorMode ? 'Disable Inspector' : 'Enable Inspector'}
                            className={`h-8 w-8 shrink-0 self-end rounded-full cursor-pointer text-green-500/80 hover:text-green-500 ${isInspectorMode ? '!bg-green-500 !text-muted' : ''}`}
                            onClick={handleSwitchInspectorMode}>
                            <LuMousePointerClick size={16} />
                        </Button>
                        <Button
                            disabled={status === 'streaming' || status === 'submitted' || !gitInited}
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
                        {status === 'streaming' || status === 'submitted' || !gitInited
                            ? <Button
                                onClick={stop}
                                size="icon"
                                variant='outline'
                                className='h-8 w-8 shrink-0 self-end rounded-full cursor-pointer'>
                                <div className='w-4 h-4 bg-gray-500 rounded animate-pulse' />
                            </Button>
                            : <Button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || !fileTree}
                                size="icon"
                                variant='outline'
                                className='h-8 w-8 shrink-0 self-end rounded-full cursor-pointer text-green-500'>
                                <FiArrowUp />
                            </Button>
                        }
                    </div>

                </div>
            </div>
        </div>
    );
}