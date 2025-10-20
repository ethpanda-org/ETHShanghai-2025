import { UIMessage } from "ai";
import { Avatar } from '@/components/avatar';
import { useAuth } from '@/hooks/useAuth';
import { TextPart } from './parts/text-part';
import { ModifyActionPart } from './parts/modify-action-part';
import { type ToolUIPart, type ReasoningUIPart } from "ai";
import { ReadActionPart } from './parts/read-action-part';
import { TbArrowBackUp, TbArrowForwardUp } from "react-icons/tb";
import { LintingPart } from './parts/linting-part';
import { useMemo } from "react";
import { InstallPart } from './parts/install-part';
import { InstantdbPart } from './parts/instantdb-part';
import ReasoningPart from './parts/reasoning-part';
import { AnalyzeImagePart } from './parts/analyze-image';
import { WebSearchPart } from './parts/web-search';

export interface MessageItemProps {
    message: UIMessage;
    msgCommitHashMap: { msgId: string, commitHash: string }[];
    chatStatus: string;
    onUndo: (commitHash: string) => void;
    onRedo: (commitHash: string) => void;
}

export function MessageItem({ message, msgCommitHashMap, chatStatus, onUndo, onRedo }: MessageItemProps) {
    const { user } = useAuth();

    const previousCommitHash = useMemo(() => {
        const previousCommitHashIndex = msgCommitHashMap.findIndex((item) => item.msgId === message.id) - 1;
        return previousCommitHashIndex >= 0 ? msgCommitHashMap[previousCommitHashIndex].commitHash : null;
    }, [msgCommitHashMap, message.id])

    const currentCommitHash = useMemo(() => {
        return msgCommitHashMap.find((item) => item.msgId === message.id)?.commitHash || null;
    }, [msgCommitHashMap, message.id])

    const hasDatabaseModify = useMemo(() => {
        return message.parts.some((part) => part.type.includes('tool-instantdb_'));
    }, [message.parts])

    const toastBgColor = message.role === 'assistant' ? 'bg-green-500/10' : 'bg-muted/50';
    return (
        <div className="flex flex-row gap-2">
            {
                message.role === 'assistant'
                    ? <div className="shrink-0 w-8 h-8 flex items-center justify-center text-xs font-bold bg-green-500 text-background rounded-full">
                        [V3]
                    </div>
                    : <div className="w-8 h-8" />
            }
            <div className={`flex flex-1 flex-col p-3 ${toastBgColor} rounded-lg `}>
                {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                        return <TextPart part={part} role={message.role} key={`${message.id}-${i}`} />;
                    } else if (part.type.includes('tool-modify_action')) {
                        return <ModifyActionPart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else if (part.type.includes('tool-read_action')) {
                        return <ReadActionPart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else if (part.type === 'step-start') {
                        return null
                    } else if (part.type === 'reasoning') {
                        return <ReasoningPart part={part as ReasoningUIPart} key={`${message.id}-${i}`} />
                    } else if (part.type.includes('tool-check_action_linting')) {
                        return <LintingPart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else if (part.type.includes('tool-npm_install')) {
                        return <InstallPart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else if (part.type.includes('tool-instantdb_')) {
                        return <InstantdbPart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else if ((part as any).toolName === 'analyze_image') {
                        return <AnalyzeImagePart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else if ((part as any).toolName === 'webSearchPrime') {
                        return <WebSearchPart part={part as ToolUIPart} key={`${message.id}-${i}`} />;
                    } else {
                        console.warn('[vibe3]: Unknown Part =>', part);
                        return null
                    }
                })}
                {
                    message.role === 'assistant' && chatStatus === 'ready' && !hasDatabaseModify && (
                        <div className="text-xs pt-2 justify-end flex flex-row gap-2">
                            {!!previousCommitHash && <div className="border border-gray-500 rounded-full p-1 text-xs text-gray-500 cursor-pointer flex flex-row gap-1 items-center hover:text-green-500"
                                onClick={() => onUndo(previousCommitHash)}>
                                <TbArrowBackUp size={14} className="grow-0 shrink-0" />
                            </div>}
                            {!!currentCommitHash && <div className="border border-gray-500 rounded-full p-1 text-xs text-gray-500 cursor-pointer flex flex-row gap-1 items-center hover:text-green-500"
                                onClick={() => onRedo(currentCommitHash)}>
                                <TbArrowForwardUp size={14} className="grow-0 shrink-0" />
                            </div>}
                        </div>
                    )
                }

            </div>
            {
                message.role === 'user'
                    && !!user
                    ? < Avatar name={user.nickname || user.email || 'User'} size="sm" />
                    : <div className="w-8 h-8" />
            }
        </div>
    );
}