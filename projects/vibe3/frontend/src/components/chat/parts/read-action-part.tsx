import { ToolUIPart } from 'ai';
import * as ReadActionType from '../types';

export function ReadActionPart({ part }: { part: ToolUIPart }) {
    if (!part.output) {
        return null;
    }

    switch (part.type) {
        case 'tool-read_action_files':
            return <ReadFilePart output={part.output as ReadActionType.ReadActionFilesOutput} />;
        case 'tool-read_action_directory':
            return <ReadDirectoryPart output={part.output as ReadActionType.ReadActionDirectoryOutput} />;
        default:
            return <div>[Unknown Read Action Part]</div>;
    }
}

export function PathPart({ path }: { path: string }) {
    return <div className='text-foreground bg-muted rounded py-1 px-2 shadow max-w-[180px] break-all'>{path}</div>
}

function ReadFilePart({ output }: { output: ReadActionType.ReadActionFilesOutput }) {
    return <div className='flex flex-row gap-2 my-1 text-xs items-start'>
        <div className='font-bold pt-1'>Read</div>
        <div className='flex flex-col gap-2'>
            {output.result.map((item) => {
                const lines = item.content.split('\n').length;
                return (
                    <div key={item.path} className='flex flex-row gap-2 items-center'>
                        <PathPart path={item.path} />
                        <div className='text-xs text-gray-500'>lines: {lines}</div>
                    </div>
                )
            })}
        </div>
    </div>;
}

function ReadDirectoryPart({ output }: { output: ReadActionType.ReadActionDirectoryOutput }) {
    return <div className='flex flex-row gap-2 my-1 text-xs items-center'>
        <div className='font-bold'>Read</div>
        <PathPart path={output.path} />
    </div>;
}