import { ToolUIPart } from 'ai';
import { PathPart } from './modify-action-part';
import { InstantdbCheckConnectionResponse, InstantdbInitDatabaseResponse } from '@/services/instantdb_api/types';
import dynamic from "next/dynamic";
import { useState, useEffect } from 'react';
import { FiSearch, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { Button } from '@/components/ui/button';
import { emitter } from '@/event_bus/emitter';

const ShyDiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });

export function InstantdbPart({ part }: { part: ToolUIPart }) {

    switch (part.type) {
        case 'tool-instantdb_check_connection':
            return <InstantdbCheckConnectionPart part={part} />;
        case 'tool-instantdb_init_database':
            return <InstantdbInitDatabasePart part={part} />;
        case 'tool-instantdb_approval_and_modify_schema':
            return <InstantdbUpdateSchemaApprovalPart part={part} />;
        case 'tool-instantdb_update_schema':
            return <InstantdbUpdateSchemaPart part={part} />;
        default:
            return null;
    }
}

export function InstantdbCheckConnectionPart({ part }: { part: ToolUIPart }) {
    const connectioned = (part.output as { result: InstantdbCheckConnectionResponse })?.result?.message.includes('Instantdb Connected');
    return part.state === 'output-available' ? <div className="whitespace-pre-wrap text-xs text-green-500 my-1 flex flex-row gap-2 items-center">
        <PathPart path={(part.output as { result: InstantdbCheckConnectionResponse }).result?.message} />
        {connectioned ? <FiCheckCircle className='text-green-500' size={12} /> : <FiAlertCircle className='text-red-500' size={12} />}
    </div> : null;
}

export function InstantdbUpdateSchemaApprovalPart({ part }: { part: ToolUIPart }) {
    const [showCodeDiff, setShowCodeDiff] = useState(false);

    const [codeGenerated, setCodeGenerated] = useState(false);
    const [userHasConfirmed, setUserHasConfirmed] = useState(!!(part.output as any)?.result);

    useEffect(() => {
        if (part.state === 'input-available' || part.state === 'output-available') {
            setCodeGenerated(true);
        }
    }, [part.state]);

    useEffect(() => {
        if (part.state === 'output-available') {
            setUserHasConfirmed(true);
        }
    }, [part.state]);


    const handleConfirm = (type: 'approved' | 'rejected') => {
        emitter.emit('ToolCallApprovalEvent', {
            toolCallId: part.toolCallId,
            result: type
        });
        setUserHasConfirmed(true);
    }

    if (part.state === 'output-error') {
        return <div className="whitespace-pre-wrap text-xs my-1">
        <div className='flex flex-row gap-2 items-center'>
            <div className='font-bold'>Modify Schema</div>
            <PathPart path={'output-error'} />
            <FiAlertCircle className=' text-red-500 over:text-foreground' size={12}  />
        </div>
    </div>
    }

    return <div>
        {!codeGenerated ? <div className="whitespace-pre-wrap text-xs my-1">
            <div className='flex flex-row gap-2 items-center'>
                <div className='font-bold'>Modifying Schema</div>
                <PathPart path={'src/db/instant.schema.ts'} processing={true} />
                <FiSearch className='cursor-pointer text-muted-foreground hover:text-foreground' size={12}
                    onClick={() => setShowCodeDiff(!showCodeDiff)} />
            </div>
        </div> : null}
        
        {codeGenerated ? <div className="whitespace-pre-wrap text-xs my-1">
            <div className='flex flex-row gap-2 items-center'>
                <div className='font-bold'>Modify Schema</div>
                <PathPart path={'src/db/instant.schema.ts'} />
                <FiSearch className='cursor-pointer text-muted-foreground hover:text-foreground' size={12}
                    onClick={() => setShowCodeDiff(!showCodeDiff)} />
            </div>
            {
                showCodeDiff && codeGenerated
                && <div className='my-2 [&_.monaco-editor]:!ml-0 [&_.monaco-editor]:!pl-0 [&_.monaco-editor_.margin]:!w-0 [&_.monaco-editor_.margin]:!min-w-0 [&_.monaco-editor_.view-overlays]:!ml-0 [&_.monaco-editor_.view-lines]:!ml-0'>
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
                        height={'300px'}
                        language={'typescript'}
                        original={(part.input as any).orginalSchema || ''}
                        modified={(part.input as any).newSchema}
                    />
                </div>
            }
        </div> : null}
        {codeGenerated && <div className='flex flex-col gap-2 border border-muted bg-muted rounded-md p-2 my-2'>
            <div className='text-sm'>Vibe3 wants to modify the database schema. This modification can not be reversed</div>
            {!userHasConfirmed &&
                <div className='flex flex-row gap-2'>
                    <Button
                        className='flex-1 text-red-500'
                        variant="outline"
                        size="sm"
                        disabled={userHasConfirmed}
                        onClick={() => handleConfirm('rejected')}>
                        Reject
                    </Button>
                    <Button
                        className='flex-1 text-green-500'
                        variant="outline"
                        size="sm"
                        disabled={userHasConfirmed}
                        onClick={() => handleConfirm('approved')}>
                        Approve
                    </Button>
                </div>
            }
            {userHasConfirmed && <>
                {
                    (part.output as any)?.result?.message.includes('rejected') &&
                    <div className='text-red-500 text-xs flex flex-row gap-1 items-center border-t border-input pt-1'>
                        <span>User rejected the schema modification</span>
                        <FiAlertCircle className='text-red-500' size={12} />
                    </div>
                }
                {
                    (part.output as any)?.result?.message.includes('Schema modified successfully') &&
                    <div className='text-green-500 text-xs flex flex-row gap-1 items-center border-t border-input pt-1'>
                        <span>User approved the schema modification</span>
                        <FiCheckCircle className='text-green-500' size={12} />
                    </div>
                }
            </>

            }
        </div>}
    </div>
}

export function InstantdbInitDatabasePart({ part }: { part: ToolUIPart }) {
    const success = (part.output as { result: InstantdbInitDatabaseResponse })?.result?.success;

    switch (part.state) {
        case 'output-available':
            return <div className="whitespace-pre-wrap text-xs text-green-500 my-1 flex flex-row gap-2 items-center">
                <PathPart path={(part.output as { result: InstantdbInitDatabaseResponse }).result?.message} />
                {success ? <FiCheckCircle className='text-green-500' size={12} /> : <FiAlertCircle className='text-red-500' size={12} />}
            </div>;
        case 'input-available':
            return <div className="whitespace-pre-wrap text-xs text-green-500 my-1">
                <PathPart path={'Initializing database...'} processing={true} />
            </div>;
        default:
            return null;
    }
}

export function InstantdbUpdateSchemaPart({ part }: { part: ToolUIPart }) {
    const success = (part.output as any)?.result?.success;
    return <div className="whitespace-pre-wrap text-xs text-green-500 my-1 flex flex-row gap-2 items-center">
        {
            part.state === 'input-available' &&
            <PathPart path={'Applying schema to Instantdb...'} processing={true} />
        }
        {
            part.state === 'output-available' &&
            <>
                <PathPart path={success ? 'Schema applied to Instantdb' : 'Failed to apply schema to Instantdb'} />
                {
                    success
                        ? <FiCheckCircle className='text-green-500' size={12} />
                        : <FiAlertCircle className='text-red-500' size={12} />
                }
            </>
        }
    </div>;
}