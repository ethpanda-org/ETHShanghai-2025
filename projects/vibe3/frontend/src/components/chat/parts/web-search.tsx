import { ToolUIPart } from 'ai';
import { PathPart } from './modify-action-part';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export function WebSearchPart({ part }: { part: ToolUIPart }) {
    const processing = part.state !== 'output-available';
    const label = processing ? 'Web Searching...' : 'Web Searched';

    const searchQuery = (part.input as any)?.search_query.slice(0, 20) + '...' || '';

    if (part.state === 'output-error') {
        return <div className='flex flex-row gap-2 my-2 text-xs items-start'>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center font-bold'>
                    <PathPart path={'Web Search Error'} />
                    <FiAlertCircle className='text-red-500' size={12} />
                </div>
            </div>
        </div>;
    }

    return <div className='flex flex-row gap-2 my-2 text-xs items-start'>
        <div className='font-bold pt-1'>{label}</div>
        {part.state !== 'input-streaming' && (
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center'>
                    <PathPart path={searchQuery} processing={processing} />
                    {!processing && <FiCheckCircle className='text-green-500' size={12} />}
                </div>
            </div>)
        }
    </div>;
}