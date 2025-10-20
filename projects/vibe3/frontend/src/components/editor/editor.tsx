import { useState, useEffect } from 'react';
import EditorFilesTree from './editor-files-tree';
import CodeEditor from './code-editor';
import { useFileTree } from '@/providers/file-tree';
import { emitter } from '@/event_bus/emitter';

export default function Editor() {
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const { fileTree } = useFileTree();

    const handleSelectPath = (path: string) => {
        if (!selectedPaths.includes(path)) {
            const newSelectedPaths = [...selectedPaths, path];
            setSelectedPaths(newSelectedPaths);
            emitter.emit('editorTabChange', { focus: path, opened: newSelectedPaths });
        } else {
            emitter.emit('editorTabChange', { focus: path, opened: selectedPaths });
        }
    }

    const handleCloseTab = (path: string) => {
        const newSelectedPaths = selectedPaths.filter(p => p !== path);
        setSelectedPaths(newSelectedPaths);
        if (newSelectedPaths.length > 0) {
            emitter.emit('editorTabChange', { focus: newSelectedPaths[newSelectedPaths.length - 1], opened: newSelectedPaths });
        } else {
            emitter.emit('editorTabChange', { focus: './src/App.tsx', opened: ['./src/App.tsx'] });
        }
    }

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
                    const [filePath] = info.split(':');
                    if (filePath) {
                        handleSelectPath(filePath);
                        emitter.emit('sourceCodeOpen', filePath);
                    }
                }
            }
        };
        window.addEventListener('message', handleVibe3InspectorAction);
        return () => {
            window.removeEventListener('message', handleVibe3InspectorAction);
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col bg-background">
            <div className='flex flex-row flex-1'>
                <EditorFilesTree
                    onSelectPath={handleSelectPath}
                />
                <div className='flex-1 w-[calc(100%-272px)] border-l border-secondary'>
                    {!!fileTree &&
                        <CodeEditor
                            onCloseTab={handleCloseTab}
                            filePaths={selectedPaths}
                            fileTree={fileTree} />
                    }
                </div>
            </div>
        </div>
    );
}