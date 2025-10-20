import { ToolUIPart } from 'ai';
import { PathPart } from './modify-action-part';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export function AnalyzeImagePart({ part }: { part: ToolUIPart }) {
    const processing = part.state !== 'output-available';
    const label = processing ? 'Analyzing Image...' : 'Analyzed Image';

    if (part.state === 'output-error' || !!(part.output as any)?.isError) {
        return <div className='flex flex-row gap-2 my-2 text-xs items-start'>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center font-bold' title={JSON.stringify(part)}>
                    <PathPart path={'Analyze Image Error'} />
                    <FiAlertCircle className='text-red-500' size={12} />
                </div>
            </div>
        </div>;
    }

    return <div className='flex flex-row gap-2 my-2 text-xs items-start'>
        {part.state !== 'input-streaming' && (
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center font-bold'>
                    <PathPart path={label} processing={processing} />
                    {!processing && <FiCheckCircle className='text-green-500' size={12} />}
                </div>
            </div>)
        }
    </div>;
}