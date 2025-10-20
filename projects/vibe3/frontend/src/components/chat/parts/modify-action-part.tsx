import { ToolUIPart } from 'ai';
import dynamic from "next/dynamic";
import * as ModifyActionType from '../types';
import { getLanguageFromPath } from '@/uitls/files';
import { FiSearch } from "react-icons/fi";
import { useState, useMemo } from 'react';

const ShyDiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });
const ShyEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.Editor), { ssr: false });

export function ModifyActionPart({ part }: { part: ToolUIPart }) {
    if (part.state === 'output-error') {
        return null
    }

    if (!part.input) {
        return <div className='font-bold text-xs'>Editing...</div>;
    } 

    switch (part.type) {
        case 'tool-modify_action_edit_file':
            return <EditFilePart part={part} />;
        case 'tool-modify_action_create_file':
            return <CreateFilePart part={part} />;
        case 'tool-modify_action_delete_file':
            return <DeleteFilePart part={part} />;
        case 'tool-modify_action_rename_file':
            return <RenameFilePart part={part} />;
        case 'tool-modify_action_move_file':
            return <MoveFilePart part={part} />;
        case 'tool-modify_action_create_directory':
            return <CreateDirectoryPart part={part} />;
        case 'tool-modify_action_delete_directory':
            return <DeleteDirectoryPart part={part} />;
        case 'tool-modify_action_rename_directory':
            return <RenameDirectoryPart part={part} />;
        case 'tool-modify_action_move_directory':
            return <MoveDirectoryPart part={part} />;
        case 'tool-modify_action_edit_file_smart':
            return <EditFileSmartPart part={part} />;
        default:
            return <div className='text-xs text-orange-300'>[Unknown Modify Action Part]</div>;
    }
}

export function PathPart({ path, processing = false }: { path: string, processing?: boolean }) {
    return <div className={`text-foreground bg-muted rounded py-1 px-2 shadow max-w-[200px] break-all ${processing ? 'animate-pulse' : ''}`}>
        {path}
    </div>
}

function EditFilePart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Editing' : 'Edited';
    return <div className='flex flex-row gap-2 my-1 text-xs items-center'>
        <div className='font-bold'>{lable}</div>
        <PathPart path={(part.input as ModifyActionType.ModifyActionEditFileInput).path} processing={isProcessing} />
    </div>;
}

function CreateFilePart({ part }: { part: ToolUIPart }) {
    const isEditing = part.state !== 'output-available';
    const lable = isEditing ? 'Creating' : 'Created';

    const [showCodeDiff, setShowCodeDiff] = useState(false);

    const height = useMemo(() => {
        const lineHeight = 20;
        const lines = (part.input as ModifyActionType.ModifyActionCreateFileInput)?.content ? Math.max((part.input as ModifyActionType.ModifyActionCreateFileInput).content.split('\n').length, 2) : 0;
        return Math.min(lines * lineHeight, 200); // 最大200px
    }, [(part.input as ModifyActionType.ModifyActionCreateFileInput)?.content]);

    return <>
        <div className='flex flex-row gap-2 my-1 text-xs items-center'>
            <div className='font-bold'>{lable}</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionCreateFileInput).path} processing={isEditing} />
            <FiSearch className='cursor-pointer text-muted-foreground hover:text-foreground' size={12}
                onClick={() => setShowCodeDiff(!showCodeDiff)} />
        </div>
        {!!part.input && showCodeDiff && (
            <div className='mb-2 [&_.monaco-editor]:!ml-0 [&_.monaco-editor]:!pl-0 [&_.monaco-editor_.margin]:!w-0 [&_.monaco-editor_.margin]:!min-w-0 [&_.monaco-editor_.view-overlays]:!ml-0 [&_.monaco-editor_.view-lines]:!ml-0'>
                <ShyEditor
                    options={{
                        readOnly: true,
                        lineNumbers: "off",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineDecorationsWidth: 0,
                        scrollbar: {
                            verticalScrollbarSize: 4,
                            horizontalScrollbarSize: 4,
                        },
                        stickyScroll: {
                            enabled: false, // 关闭顶部固定的函数名
                        },
                        contextmenu: false,
                        automaticLayout: true,
                        padding: { top: 0, bottom: 0 },
                        codeLens: false,
                        overviewRulerLanes: 0,
                        lineNumbersMinChars: 0,
                        showFoldingControls: 'never',
                    }}
                    theme="vs-dark"
                    width={'100%'}
                    height={height}
                    language={getLanguageFromPath((part.input as ModifyActionType.ModifyActionCreateFileInput).path)}
                    value={(part.input as ModifyActionType.ModifyActionCreateFileInput).content}
                />
            </div>
        )}
    </>;
}

function DeleteFilePart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Deleting' : 'Deleted';
    return <div className='flex flex-row gap-2 my-1 text-xs items-center'>
        <div className='font-bold'>{lable}</div>
        <PathPart path={(part.input as ModifyActionType.ModifyActionDeleteFileInput).path} processing={isProcessing} />
    </div>;
}

function RenameFilePart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Renaming' : 'Renamed';
    return <div className='flex flex-col gap-2 my-1 text-xs'>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>{lable}</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionRenameFileInput).path} processing={isProcessing} />
        </div>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>To</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionRenameFileInput).newPath} processing={isProcessing} />
        </div>
    </div>;
}

function MoveFilePart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Moving' : 'Moved';
    return <div className='flex flex-col gap-2 my-1 text-xs'>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>{lable}</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionMoveFileInput).path} processing={isProcessing} />
        </div>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>To</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionMoveFileInput).newPath} processing={isProcessing} />
        </div>
    </div>;
}

function CreateDirectoryPart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Creating' : 'Created';
    return <div className='flex flex-row gap-2 my-1 text-xs items-center'>
        <div className='font-bold'>{lable}</div>
        <PathPart path={(part.input as ModifyActionType.ModifyActionCreateDirectoryInput).path} processing={isProcessing} />
    </div>;
}

function DeleteDirectoryPart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Deleting' : 'Deleted';
    return <div className='flex flex-row gap-2 my-1 text-xs items-center'>
        <div className='font-bold'>{lable}</div>
        <PathPart path={(part.input as ModifyActionType.ModifyActionDeleteDirectoryInput).path} processing={isProcessing} />
    </div>;
}

function RenameDirectoryPart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Renaming' : 'Renamed';
    return <div className='flex flex-col gap-2 my-1 text-xs'>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>{lable}</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionRenameDirectoryInput).path} processing={isProcessing} />
        </div>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>To</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionRenameDirectoryInput).newPath} processing={isProcessing} />
        </div>
    </div>;
}

function MoveDirectoryPart({ part }: { part: ToolUIPart }) {
    const isProcessing = part.state !== 'output-available';
    const lable = isProcessing ? 'Moving' : 'Moved';
    return <div className='flex flex-col gap-2 my-1 text-xs'>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>{lable}</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionMoveDirectoryInput).path} processing={isProcessing} />
        </div>
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>To</div>
            <PathPart path={(part.input as ModifyActionType.ModifyActionMoveDirectoryInput).newPath} processing={isProcessing} />
        </div>
    </div>;
}

function EditFileSmartPart({ part }: { part: ToolUIPart }) {
    const input = part.input as ModifyActionType.ModifyActionEditFileSmartInput;
    const isProcessing = part.state !== 'output-available';
    const isCompleted = part.state === 'output-available';
    const [showCodeDiff, setShowCodeDiff] = useState(false);


    const label = isProcessing ? 'Editing' : 'Edited';

    // 计算编辑器高度
    const lineHeight = 20;
    const lines = input.newContent ? Math.max(input.newContent.split('\n').length, 2) : 0;
    const height = Math.min(lines * lineHeight, 200); // 最大200px

    return <>
        <div className='flex flex-col gap-2 my-1 text-xs'>
            {/* 主要信息行 */}
            <div className='flex flex-row gap-2 items-center'>
                <div className='font-bold'>{label}</div>
                <PathPart path={input.path} processing={isProcessing} />
                <FiSearch className='cursor-pointer text-muted-foreground hover:text-foreground' size={12}
                    onClick={() => setShowCodeDiff(!showCodeDiff)} />
            </div>
        </div>

        {/* 代码编辑器 */}
        {isCompleted && input.newContent && showCodeDiff && (
            <div className='mb-2 [&_.monaco-editor]:!ml-0 [&_.monaco-editor]:!pl-0 [&_.monaco-editor_.margin]:!w-0 [&_.monaco-editor_.margin]:!min-w-0 [&_.monaco-editor_.view-overlays]:!ml-0 [&_.monaco-editor_.view-lines]:!ml-0'>
                <ShyDiffEditor
                    options={{
                        readOnly: true,
                        lineNumbers: "off",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineDecorationsWidth: 0,
                        scrollbar: {
                            verticalScrollbarSize: 4,
                            horizontalScrollbarSize: 4,
                        },
                        stickyScroll: {
                            enabled: false, // 关闭顶部固定的函数名
                        },
                        contextmenu: false,
                        automaticLayout: true,
                        padding: { top: 0, bottom: 0 },
                        codeLens: false,
                        compactMode: true,
                        renderOverviewRuler: false
                    }}
                    theme="vs-dark"
                    width={'100%'}
                    height={height}
                    language={getLanguageFromPath(input.path)}
                    original={input.targetContent || ''}
                    modified={input.newContent}
                />
            </div>
        )}
    </>;
}