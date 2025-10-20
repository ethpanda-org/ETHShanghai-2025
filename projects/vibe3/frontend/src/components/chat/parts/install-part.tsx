import * as ActionTypes from '../types';
import { ToolUIPart } from 'ai';
import { PathPart } from './read-action-part';

export function InstallPart({ part }: { part: ToolUIPart }) {
    if (!part.input) {
        return null;
    }
    const processing = !!part.input && !part.output;
    const label = processing ? 'Installing...' : 'Installed';
    
    return <div className='flex flex-row gap-2 my-1 text-xs items-start'>
        <div className='font-bold pt-1'>{label}</div>
        <div className='flex flex-col gap-2'>
            {((part.input as ActionTypes.NpmInstallInput).packageNames || []).map((name) => {
                return <div key={name} className='flex flex-row gap-2 items-center'>
                    <PathPart path={name} />
                </div>
            })}
        </div>
    </div>;
}