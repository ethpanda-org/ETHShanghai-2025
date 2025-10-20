import { type ToolSet } from 'ai'
import { z } from 'zod'
import {
    type InstantdbCheckConnectionResponse,
    type HandleInstantdbModifySchemaApprovalParams,
    type HandleInstantdbModifySchemaApprovalResponse,
    type HandleInstantdbUpdateSchemaParams,
    type HandleInstantdbUpdateSchemaResponse
} from './types'
import { type WebContainer } from '@webcontainer/api'
import { schema, permissions, index } from './template'
import { getEnvs, createOrUpdateEnvs } from '../vibe3_api/envs'
import { createInstantdbApp, updateInstantdbSchema } from './index'
import { resolveNpmInstall } from '@/components/chat/utils/npm'
import { extractISchemaContent } from './utils'
import { i } from '@instantdb/react'
import { emitter } from '@/event_bus/emitter';

export const instantdb_tools: ToolSet = {
    instantdb_check_connection: {
        description: "Check whether the user has connected to Instantdb to enable database features, if not, output '***finished***' to stop the assistant",
        inputSchema: z.object({}),
    },
    instantdb_init_database: {
        description: "This is the ONLY WAY to initialize the database service for the project. Only call it when Instantdb is connected successfully. It will create src/db/instant.schema.ts, src/db/instant.perms.ts, and src/db/index.ts to set up the database for the project. If it fails, output ***finished*** to stop the assistant.",
        inputSchema: z.object({}),
    },
    instantdb_approval_and_modify_schema: {
        description: "This is the ONLY WAY to to modify database schema to the instantdb, user will review the schema modification, if user reject your request, output '***finished***' to stop the assistant",
        inputSchema: z.object({
            orginalSchema: z.string().describe("The original schema file 'instant.schema.ts' content"),
            newSchema: z.string().describe("The new schema file 'instant.schema.ts' content after modification"),
        }),
    },
    instantdb_update_schema: {
        description: "Apply the database schema to the instantdb after modifed \`instant.schema.ts\`, calling this tool will push the new schema to the instantdb",
        inputSchema: z.object({
            schema: z.string().describe("The schema file 'src/db/instant.schema.ts' content after modification"),
        }),
    }
}

export const instantdbCheckConnection = (): InstantdbCheckConnectionResponse => {
    const token = document.cookie.split('; ').find(row => row.startsWith('instantdb_token='))?.split('=')[1];
    return {
        success: !!token,
        message: token ? 'Instantdb Connected' : 'Instantdb Not Connected'
    }
}

export const instantdbInitDatabase = async (webContainer: WebContainer, appId: string) => {
    try {
        const envs = await getEnvs(appId);
        let instantAppId = envs.find(env => env.key === 'VITE_INSTANT_APP_ID')?.value;
        if (!instantAppId) {
            // create instantdb app and get app id
            instantAppId = await createInstantdbApp(`database-${appId}`);

            // save envs
            await createOrUpdateEnvs(appId, { 'VITE_INSTANT_APP_ID': instantAppId });

            // todo: write .env file to webContainer
            let ensContent = '';
            try {
                ensContent = await webContainer.fs.readFile('.env', 'utf8');
            } catch (e) {
                ensContent = ''
            }
            await webContainer.fs.writeFile('.env', `${ensContent}\nVITE_INSTANT_APP_ID=${instantAppId}`);
        }

        // write dbfiles to webContainer
        await webContainer.fs.mkdir('src/db');
        await Promise.all([
            await webContainer.fs.writeFile('src/db/instant.schema.ts', schema),
            await webContainer.fs.writeFile('src/db/instant.perms.ts', permissions),
        ])
        await webContainer.fs.writeFile('src/db/index.ts', index)

        // read package.json and add dependencies
        const packageJson = await webContainer.fs.readFile('package.json', 'utf8');
        if (!packageJson.includes('@instantdb/react')) {
            await resolveNpmInstall({ packageNames: ['@instantdb/react'] }, webContainer);
        }

        return {
            success: true,
            message: 'Database initialized'
        }
    } catch (error) {
        console.error('instantdbInitDatabase erro', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to initialize database'
        }
    }
}

export const handleInstantdbModifySchemaApproval = async ({ toolCallId, webContainer, newSchema }: HandleInstantdbModifySchemaApprovalParams): Promise<HandleInstantdbModifySchemaApprovalResponse> => {
    const approvalPromise = new Promise((resolve) => {
        emitter.on('ToolCallApprovalEvent', (event) => {
            const { toolCallId: eventToolCallId, result } = event;
            if (toolCallId === eventToolCallId) {
                resolve(result);
            }
        });
    });


    const result = await approvalPromise
    if (result === 'rejected') {
        return {
            success: false,
            message: 'User rejected the schema modification'
        };
    }

    try {
        webContainer.fs.writeFile('src/db/instant.schema.ts', newSchema);
        return {
            success: true,
            message: 'Schema modified successfully'
        };
    } catch (error) {
        console.error('handleInstantdbUpdateSchemaApproval error', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to modify schema'
        };
    }
}

export const handleInstantdbUpdateSchema = async ({ appId, webContainer }: HandleInstantdbUpdateSchemaParams): Promise<HandleInstantdbUpdateSchemaResponse> => {
    const envs = await getEnvs(appId);
    const instantAppId = envs.find(env => env.key === 'VITE_INSTANT_APP_ID')?.value;
    if (!instantAppId) {
        return {
            success: false,
            message: 'InstantAppId not found, please connect to Instantdb first'
        };
    }

    try {
        const newSchemaContent = await webContainer.fs.readFile('src/db/instant.schema.ts', 'utf8');
        const schemaStr = extractISchemaContent(newSchemaContent)
        if (!schemaStr) {
            return {
                success: false,
                message: 'Invalid schema content'
            };
        }

        const newSchema = new Function('i', `return i.schema(${schemaStr})`)(i)
        await updateInstantdbSchema(newSchema, instantAppId);
        return {
            success: true,
            message: 'Schema updated successfully'
        };
    } catch (error) {
        console.error('handleInstantdbUpdateSchema error', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update schema'
        };
    }
}

export const handleInstantdbToolCall = async (toolCall: any, webContainer: WebContainer, appId: string) => {
    if (toolCall.toolName === 'instantdb_check_connection') {
        return instantdbCheckConnection();
    }
    if (toolCall.toolName === 'instantdb_init_database') {
        return instantdbInitDatabase(webContainer, appId);
    }
    if (toolCall.toolName === 'instantdb_approval_and_modify_schema') {
        return handleInstantdbModifySchemaApproval({ toolCallId: toolCall.toolCallId, webContainer, newSchema: toolCall.input.newSchema });
    }
    if (toolCall.toolName === 'instantdb_update_schema') {
        return handleInstantdbUpdateSchema({ appId, webContainer });
    }
}

