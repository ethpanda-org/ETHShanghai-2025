import request from "../config";
import type { ChatRequest, ChatResponse } from "../interface/chat";

/**
 * 发送聊天
 */
function chatSend(address: string, payload: ChatRequest) {
    return request<ChatResponse>({
        url: "/chat",
        method: "post",
        data: payload,
        headers: { "x-address": address },
    });
}

export default {
    chatSend,
};
