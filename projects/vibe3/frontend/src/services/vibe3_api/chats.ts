import { authenticatedRequest, tokenManager, ApiException } from "./auth";

export interface ChatItem {
  id: string;
  client_chatid: string;
  created_at: string;
  updated_at: string;
}

export async function createChat(opts: {
  appId: string;
  clientChatId: string;
}): Promise<ChatItem> {
  const token = tokenManager.getToken();

  if (!token) {
    throw new ApiException(401, "Unauthorized");
  }

  const res = await authenticatedRequest<{ chat: ChatItem }>(
    `/chats/create/${opts.appId}`,
    token,
    { method: "POST", body: JSON.stringify({ client_chatid: opts.clientChatId })}
  );

  return res.chat;
}
