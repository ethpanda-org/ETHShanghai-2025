/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConversationCreateBody } from '../models/ConversationCreateBody';
import type { ConversationCreateResponse } from '../models/ConversationCreateResponse';
import type { ConversationDetail } from '../models/ConversationDetail';
import type { ConversationList } from '../models/ConversationList';
import type { Message } from '../models/Message';
import type { MessageList } from '../models/MessageList';
import type { MessageStartResponse } from '../models/MessageStartResponse';
import type { Status } from '../models/Status';
import type { UserMessageRequest } from '../models/UserMessageRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * List Conversations
     * @returns ConversationList Successful Response
     * @throws ApiError
     */
    public static getConversations({
        page = 1,
        pageSize = 20,
        order = 'desc',
    }: {
        page?: number,
        pageSize?: number,
        order?: string,
    }): CancelablePromise<ConversationList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversations',
            query: {
                'page': page,
                'page_size': pageSize,
                'order': order,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Conversation
     * @returns ConversationCreateResponse Successful Response
     * @throws ApiError
     */
    public static postConversations({
        requestBody,
    }: {
        requestBody?: (ConversationCreateBody | null),
    }): CancelablePromise<ConversationCreateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/conversations',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Conversation
     * @returns void
     * @throws ApiError
     */
    public static deleteConversations({
        cid,
    }: {
        cid: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/conversations/{cid}',
            path: {
                'cid': cid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Conversation
     * @returns ConversationDetail Successful Response
     * @throws ApiError
     */
    public static getConversation({
        cid,
    }: {
        cid: string,
    }): CancelablePromise<ConversationDetail> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversations/{cid}',
            path: {
                'cid': cid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Messages
     * @returns MessageList Successful Response
     * @throws ApiError
     */
    public static getConversationsMessages({
        cid,
        page = 1,
        pageSize = 50,
        order = 'asc',
    }: {
        cid: string,
        page?: number,
        pageSize?: number,
        order?: string,
    }): CancelablePromise<MessageList> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversations/{cid}/messages',
            path: {
                'cid': cid,
            },
            query: {
                'page': page,
                'page_size': pageSize,
                'order': order,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create User Message
     * @returns MessageStartResponse Successful Response
     * @throws ApiError
     */
    public static postConversationsMessages({
        cid,
        requestBody,
    }: {
        cid: string,
        requestBody: UserMessageRequest,
    }): CancelablePromise<MessageStartResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/conversations/{cid}/messages',
            path: {
                'cid': cid,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Message
     * @returns void
     * @throws ApiError
     */
    public static deleteConversationsMessages({
        cid,
        mid,
    }: {
        cid: string,
        mid: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/conversations/{cid}/messages/{mid}',
            path: {
                'cid': cid,
                'mid': mid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Message
     * @returns Message Successful Response
     * @throws ApiError
     */
    public static getConversationsMessagesMid({
        cid,
        mid,
    }: {
        cid: string,
        mid: string,
    }): CancelablePromise<Message> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversations/{cid}/messages/{mid}',
            path: {
                'cid': cid,
                'mid': mid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Conversation Status
     * @returns Status Successful Response
     * @throws ApiError
     */
    public static getConversationsStatus({
        cid,
    }: {
        cid: string,
    }): CancelablePromise<Status> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversations/{cid}/status',
            path: {
                'cid': cid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stream Conversation
     * @returns any Successful Response
     * @throws ApiError
     */
    public static streamConversation({
        cid,
    }: {
        cid: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/conversations/{cid}/stream',
            path: {
                'cid': cid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
