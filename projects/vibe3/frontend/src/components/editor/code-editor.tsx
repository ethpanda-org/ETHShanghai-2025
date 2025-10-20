import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { FiX } from "react-icons/fi";
import { FileSystemTree } from '@webcontainer/api';
import Editor, { type Monaco } from '@monaco-editor/react';
import { getLanguageFromPath } from '@/uitls/files';
import { useFileTree } from '@/providers/file-tree';
import { emitter } from '../../event_bus/emitter';
import { editor } from 'monaco-editor';
import { getFileFromFileTree } from '@/uitls/files';
import * as ActionTypes from '@/components/chat/types';
import { resolveEditFile } from '@/components/chat/utils/modify';
import { useWebContainer } from '@/providers/web-container';
import { exportFileTreeFromWebContainer } from '@/uitls/files';

export interface CodeEditorProps {
    filePaths: string[];
    fileTree: FileSystemTree;
    onCloseTab?: (path: string) => void;
}

export default function CodeEditor({ filePaths, onCloseTab }: CodeEditorProps) {
    const { fileTree, setFileTree } = useFileTree();
    const { webContainer } = useWebContainer();

    const openedTabs = useMemo(() => {
        return filePaths
    }, [filePaths]);

    const [foucusTab, setFoucusTab] = useState<string | null>(null);
    const tabListRef = useRef<HTMLDivElement>(null);
    const updateContentRef = useRef<{ [key: string]: ActionTypes.ModifyActionEditFileOutput }>({});
    const monacoEditorRef = useRef<Monaco>(null);
    const editorInstanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const highlightDecorationsRef = useRef<string[]>([]);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [monacoLoadingState, setMonacoLoadingState] = useState<'loading' | 'loaded' | 'ready'>('loading');
    const [highlighting, setHighlighting] = useState<null | { lineNumber: number, columnNumber?: number, path: string }>(null);
    const isSettingPositionRef = useRef(false);

    // 清除高亮
    const clearHighlight = useCallback(() => {
        if (!editorInstanceRef.current || highlightDecorationsRef.current.length === 0) return;

        editorInstanceRef.current.deltaDecorations(highlightDecorationsRef.current, []);
        highlightDecorationsRef.current = [];
    }, []);

    // 执行高亮并设置光标变化监听器
    const executeHighlight = useCallback((lineNumber: number, columnNumber?: number) => {
        if (!editorInstanceRef.current) return;

        const editor = editorInstanceRef.current;
        const model = editor.getModel();
        if (!model) {
            return;
        }

        // 清除之前的高亮
        clearHighlight();

        // 创建高亮装饰
        const decorations = editor.deltaDecorations([], [
            {
                range: {
                    startLineNumber: lineNumber,
                    startColumn: 1,
                    endLineNumber: lineNumber,
                    endColumn: model.getLineMaxColumn(lineNumber)
                },
                options: {
                    isWholeLine: true,
                    className: 'highlighted-line-green',
                    marginClassName: 'highlighted-line-margin-green',
                    inlineClassName: 'highlighted-line-green-inline'
                }
            }
        ]);

        highlightDecorationsRef.current = decorations;

        // 滚动到指定行，让行显示在视口顶部附近（避免被顶部固定元素遮挡）
        editor.revealLine(lineNumber < 10 ? 10 : lineNumber);

        // 如果指定了列，设置光标位置
        if (columnNumber) {
            isSettingPositionRef.current = true;
            editor.setPosition({ lineNumber, column: columnNumber });
            editor.focus();
            // 使用 setTimeout 确保位置设置完成后重置标志
            setTimeout(() => {
                isSettingPositionRef.current = false;
            }, 0);
        }

        // 注册光标位置变化监听器（如果还没有注册的话）
        const disposable = editor.onDidChangeCursorPosition(() => {
            // 只有在非程序设置位置时才清除高亮
            if (!isSettingPositionRef.current) {
                clearHighlight();
                disposable.dispose(); // 清除监听器，避免重复注册
            }
        });
    }, [clearHighlight]);

    // 监听高亮状态，当条件满足时自动执行高亮
    useEffect(() => {
        if (highlighting &&
            foucusTab === highlighting.path &&
            monacoLoadingState === 'ready' &&
            isEditorReady &&
            editorInstanceRef.current) {

            // 执行高亮逻辑
            const { lineNumber, columnNumber } = highlighting;
            setTimeout(() => {
                executeHighlight(lineNumber, columnNumber);
                // 清除高亮状态
                setHighlighting(null);
            }, 600);
        }
    }, [highlighting, foucusTab, monacoLoadingState, isEditorReady, executeHighlight]);

    useEffect(() => {
        if (openedTabs.length) {
            setFoucusTab(openedTabs[openedTabs.length - 1]);
        } else {
            setFoucusTab(null);
        }
    }, [openedTabs]);

    // 切换文件时清除高亮
    useEffect(() => {
        clearHighlight();
    }, [foucusTab]);

    useEffect(() => {
        // listen vibe3 inspector action
        const handleVibe3InspectorAction = (event: MessageEvent) => {
            if (event.data.source !== 'vite-plugin-vibe3-inspector') {
                return;
            }


            if (event.data.action === 'source_code') {
                const info = event.data.info;

                if (info) {
                    // info 格式: "path/to/file.tsx:line:column"
                    const [filePath, line, column] = info.split(':');
                    const lineNumber = parseInt(line, 10);
                    const columnNumber = parseInt(column, 10);

                    // 设置高亮状态，让useEffect自动处理
                    if (!isNaN(lineNumber)) {
                        setHighlighting({
                            lineNumber,
                            columnNumber: isNaN(columnNumber) ? undefined : columnNumber,
                            path: filePath
                        });

                        // 如果文件不匹配，尝试切换到目标文件
                        if (foucusTab !== filePath) {
                            if (openedTabs.includes(filePath)) {
                                setFoucusTab(filePath);
                            } else if (!foucusTab && openedTabs.length > 0) {
                                setFoucusTab(openedTabs[0]);
                            }
                        }
                    }
                }
            }
        };
        window.addEventListener('message', handleVibe3InspectorAction);
        return () => {
            window.removeEventListener('message', handleVibe3InspectorAction);
        };
    }, [foucusTab, isEditorReady]);

    useEffect(() => {
        const handlerSelectPath = ({ focus }: { focus: string }) => {
            setFoucusTab(focus);
        }

        emitter.on('editorTabChange', handlerSelectPath);
        return () => {
            emitter.off('editorTabChange', handlerSelectPath);
        };
    }, []);

    const content = useMemo(() => {
        if (!foucusTab || !fileTree) return ''
        const _content = getFileFromFileTree(fileTree, foucusTab)?.file.contents;
        if (_content instanceof ArrayBuffer) {
            return new TextDecoder().decode(_content);
        } else {
            return _content as string || '';
        }
    }, [foucusTab, fileTree]);

    const handleEditorBeforeMount = (monaco: Monaco) => {
        setMonacoLoadingState('loading');

        monacoEditorRef.current = monaco;

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true,
        });

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true,
        });

        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: false,
        });
    };

    const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
        editorInstanceRef.current = editor;
        
        // 等待编辑器完全初始化
        setTimeout(() => {
            setIsEditorReady(true);
            setMonacoLoadingState('ready');
        }, 100);
    }, [foucusTab]);

    const handleEditorChange = useCallback((value: string | undefined, event: editor.IModelContentChangedEvent) => {
        if (!foucusTab) return;
        if (!fileTree) return;
        updateContentRef.current[foucusTab] = {
            type: 'modify_action_edit_file' as ActionTypes.ToolType.modify_action_edit_file,
            path: foucusTab,
            content: value || ''
        };
        if (!event.isFlush) {
            emitter.emit('appEdited', true);
        }
    }, [foucusTab, fileTree]);

    const handlSaveChange = async () => {
        console.log('[vibe3]: 修改队列（代码编辑器） =>', Object.values(updateContentRef.current));
        for (const action of Object.values(updateContentRef.current)) {
            await resolveEditFile(action, webContainer!);
        }
        const newFileTree = await exportFileTreeFromWebContainer(webContainer!);
        setFileTree(newFileTree);
        updateContentRef.current = {};
        emitter.emit('appEdited', false);
    }

    const handleDiscardChange = () => {
        monacoEditorRef.current?.editor.getModels().map(model => {
            const path = model.uri.path.replace('/', '');
            const _content = getFileFromFileTree(fileTree, path)?.file.contents;

            if (_content) {
                model.setValue(_content as string);
            }
        });
        updateContentRef.current = {};
        emitter.emit('appEdited', false);
    }

    useEffect(() => {
        emitter.on('saveManualEdit', handlSaveChange);
        emitter.on('discardApp', handleDiscardChange);

        return () => {
            emitter.off("saveManualEdit", handlSaveChange);
            emitter.off("discardApp", handleDiscardChange);
        };
    }, []);


    return (
        <div className='border-secondary h-full flex flex-col overflow-hidden'>
            <div ref={tabListRef} role="tablist" className='border-secondary flex items-center text-muted-foreground h-auto w-full justify-between overflow-x-auto rounded-none bg-background p-0 scrollbar-hide'>
                <div className="flex items-center">
                    {openedTabs.map((filePath) => {
                        return <div key={filePath}
                            onClick={() => setFoucusTab(filePath)}
                            className={`select-none cursor-pointer hover:bg-muted hover:border-muted border-b-2 ${foucusTab === filePath ? ' !border-b-green-600' : 'border-b-background'} tab inline-flex flex-row flex-shrink-0 items-center justify-between gap-1 border-r p-2 min-w-[150px] group`}>
                            <div className='text-sm text-muted-foreground'>{filePath}</div>
                            <FiX
                                onClick={() => onCloseTab?.(filePath)}
                                className='text-muted-foreground hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity' />
                        </div>
                    })}
                </div>
            </div>

            <div className='flex flex-col overflow-auto flex-1'>
                {!!foucusTab ? (
                    <>
                        <Editor
                            className='flex-1'
                            theme="vs-dark"
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            path={foucusTab || ''}
                            language={getLanguageFromPath(foucusTab || '')}
                            value={content}
                            beforeMount={handleEditorBeforeMount}
                            loading={<div className='flex items-center justify-center h-full'>
                                <div className='text-center'>
                                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
                                    <p className='text-sm text-muted-foreground'>loading...</p>
                                </div>
                            </div>}
                            options={{
                                overviewRulerLanes: 0,
                                minimap: { enabled: false },
                            }}
                        />
                    </>
                ) : (
                    <div className='h-full w-full flex items-center justify-center'>
                        <p className='text-muted-foreground'>No file selected</p>
                    </div>
                )}
            </div>
        </div>
    );
}
