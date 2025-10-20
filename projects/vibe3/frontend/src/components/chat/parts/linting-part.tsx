import { ToolUIPart } from 'ai';
import { PathPart } from './read-action-part';
import * as ActionTypes from '../types';

export function LintingPart({ part }: { part: ToolUIPart }) {
    if (!part.output) {
        return null;
    }

    const errors = (part.output as ActionTypes.LintingOutput).result
        .split('\n')
        .filter(line => line.includes('error'));

    const label = errors.length > 0 ? `${errors.length} Errors` : 'No Errors Found';

    return <div className='flex flex-row gap-2 my-1 text-xs items-center'>
        <div className='font-bold'>Linting</div>
        <PathPart path={label} />
    </div>;
}