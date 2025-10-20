import { type WebContainer } from '@webcontainer/api';

export interface InstantdbCheckConnectionResponse {
    success: boolean;
    message: string;
}

export interface InstantdbInitDatabaseResponse {
    success: boolean;
    message: string;
}

export interface HandleInstantdbUpdateSchemaParams {
    appId: string;
    webContainer: WebContainer;
}

export interface HandleInstantdbUpdateSchemaResponse {
    success: boolean;
    message: string;
}

export interface HandleInstantdbModifySchemaApprovalParams {
    toolCallId: string;
    webContainer: WebContainer;
    newSchema: string;
}

export interface HandleInstantdbModifySchemaApprovalResponse {
    success: boolean;
    message: string;
}