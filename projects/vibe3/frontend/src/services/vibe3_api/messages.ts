import { UIMessage } from "ai";
import { tokenManager, ApiException, authenticatedRequest } from "./auth";

export interface MessageItem {
  id: string;
  client_chatid: string;
  content: string;
  model: string;
  created_at: string;
}

export async function appendMessage(opts: {
  appId: string;
  clientChatId: string;
  model: string;
  clientMessageId: string;
  content: UIMessage;
}, token?: string): Promise<void> {
  const _token = token || tokenManager.getToken();
  if (!_token) {
    throw new ApiException(401, "Unauthorized");
  }

  await authenticatedRequest(`/messages/append/${opts.appId}`, _token, {
    method: "POST",
    body: JSON.stringify({
      content: JSON.stringify(opts.content),
      model: opts.model,
      client_messageid: opts.clientMessageId,
      client_chatid: opts.clientChatId,
    }),
  });
}

export async function getMessages(opts: {
  appId: string;
  clientChatId?: string;
  cursor?: number;
  last?: number;
  first?: number;
  orderBy?: string;
  order?: string;
}): Promise<MessageItem[]> {
  const token = tokenManager.getToken();
  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  const searchParams = new URLSearchParams();
  if (opts.cursor) {
    searchParams.set('cursor', opts.cursor.toString());
  }
  if (opts.last) {
    searchParams.set('last', opts.last.toString());
  }
  if (opts.first) {
    searchParams.set('first', opts.first.toString());
  }
  if (opts.orderBy) {
    searchParams.set('order_by', opts.orderBy);
  }
  if (opts.order) {
    searchParams.set('order', opts.order);
  }
  if (opts.clientChatId) {
    searchParams.set('client_chatid', opts.clientChatId);
  }
  
  const res = await authenticatedRequest<{ data: {messages: MessageItem[]} }>(
    `/messages/${opts.appId}?${searchParams.toString()}`,
    token
  );

  return res.data.messages;
}

export async function setTokenUsage(opts: {
  appId: string;
  clientMessageId: string;
  inputTokens: number;
  outputTokens: number;
}, token?: string): Promise<void> {
  const _token = token || tokenManager.getToken();
  if (!_token) {
    throw new ApiException(401, "Unauthorized");
  }

  await authenticatedRequest(`/messages/accumulate_tokens/${opts.appId}`, _token, {
    method: "POST",
    body: JSON.stringify({
      client_messageid: opts.clientMessageId,
      input_tokens: opts.inputTokens,
      output_tokens: opts.outputTokens,
    }),
  });
}
