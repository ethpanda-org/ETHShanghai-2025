import { TextUIPart } from 'ai';
import { useMemo } from 'react';

export function TextPart({ part, role }: { part: TextUIPart, role: string }) {
    const displayText = useMemo(() => {
        return part.text
        .replace('***User Prompt***', '')
        .split('***Focused Tab***')[0]
        .split('***Runtime Error***')[0]
        .split('***Focus Files***')[0]
        .replace('***finished***', '')
        .trim();
    }, [part.text]);
    
    return <div className={`whitespace-pre-wrap break-all text-xs ${role === 'assistant' ? 'text-green-500' : 'text-foreground'}`}>
        {displayText}
    </div>;
}