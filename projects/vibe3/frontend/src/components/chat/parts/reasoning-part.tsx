import { PathPart } from './modify-action-part';
import { type ReasoningUIPart } from 'ai';
import { useState, useMemo } from 'react';
import { FiSearch } from 'react-icons/fi';

export default function ReasoningPart({ part }: { part: ReasoningUIPart }) {
    const [showText, setShowText] = useState(false);
    const thinking = part.state !== 'done';

    const displayText = useMemo(() => {
        return part.text.replace('</think>', '')
    }, [part.text]);

    if (!displayText.trim()) {
        return null;
    }

    return <>
        <div className='flex flex-col gap-2 my-1 text-xs'>
            {/* 主要信息行 */}
            <div className='flex flex-row gap-2 items-center'>
                <PathPart path={thinking ? 'Thinking...' : 'Thought'} processing={thinking} />
                <FiSearch className='cursor-pointer text-muted-foreground hover:text-foreground' size={12}
                    onClick={() => setShowText(!showText)} />
            </div>
        </div>
        {
            showText && (
                <div className='flex flex-col gap-2 my-1 text-xs text-gray-500 !italic'>
                    {displayText}
                </div>
            )
        }
    </>
}