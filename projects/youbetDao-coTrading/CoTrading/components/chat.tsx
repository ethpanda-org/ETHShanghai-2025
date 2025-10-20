"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatHeader } from "@/components/chat-header";
import { Artifact } from "@/components/artifact";
import { MultimodalInput } from "./multimodal-input";
import { Messages } from "./messages";
import type { VisibilityType } from "./visibility-selector";
import type { Attachment, ChatMessage } from "@/lib/types";
import { useArtifact, useArtifactSelector } from "@/hooks/use-artifact";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useDataStream } from "./data-stream-provider";
import { partsFromEvents } from "@/lib/timeline/replay-events-to-parts";
import { toast } from "./toast";
import { generateUUID } from "@/lib/utils";
import { OpenAPI } from "@/openapi";
import { Api } from "@/api";
import { openConversationStream } from "@/api/sse";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { TokenInfo } from "@/components/artifact";

const CHAT_MODEL_COOKIE_KEY = "chat-model";

// ✅ Base 主网 WETH（包装 ETH，所有 DEX / 0x 都用它表示 ETH）
const DEFAULT_BASE_TOKEN: TokenInfo = {
  address: "0x4200000000000000000000000000000000000006",
  symbol: "ETH",
  name: "Wrapped Ether",
};

// ✅ Base 主网 USDC（官方 Circle 原生稳定币，Swap 常用）
const DEFAULT_QUOTE_TOKEN: TokenInfo = {
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  symbol: "USDC",
  name: "USD Coin",
};

// ✅ Base 主网 Chain ID
const DEFAULT_CHAIN_ID = 8453;

function getChatModelFromCookies() {
  if (typeof document === "undefined") {
    return DEFAULT_CHAT_MODEL;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CHAT_MODEL_COOKIE_KEY}=([^;]+)`)
  );

  return match ? decodeURIComponent(match[1]) : DEFAULT_CHAT_MODEL;
}

const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
OpenAPI.BASE = DEFAULT_API_BASE;

interface BackendMessage {
  message_id: string;
  role: string;
  content?: string | null;
  created_at?: string | null;
  events?: any[] | null;
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.cause === "string") return data.cause;
  } catch (_) {
    // ignore JSON parsing errors and fall through to default message
  }
  return `请求失败 (${response.status})`;
}

function mapBackendMessage(item: BackendMessage): ChatMessage {
  const content = typeof item.content === "string" ? item.content : "";
  const createdAt = item.created_at
    ? new Date(item.created_at).toISOString()
    : new Date().toISOString();

  const parts: ChatMessage["parts"] = [] as ChatMessage["parts"];
  if (Array.isArray(item.events)) {
    parts.push(...(partsFromEvents(item.events) as ChatMessage["parts"]));
  }
  if (content) {
    parts.push({ type: "text", text: content } as ChatMessage["parts"][number]);
  }

  return {
    id: item.message_id ?? generateUUID(),
    role: (item.role as ChatMessage["role"]) ?? "assistant",
    parts,
    metadata: {
      createdAt,
    },
  };
}

export function Chat({
  id,
  initialMessages,
  initialVisibilityType,
  isReadonly,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
}) {
  const initialConversationId = autoResume && id ? id : null;

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  );
  const resolvedChatId = conversationId ?? id;

  const { setArtifact } = useArtifact();
  const { visibilityType } = useChatVisibility({
    chatId: resolvedChatId,
    initialVisibilityType,
  });

  const { setDataStream } = useDataStream();
  const [selectedModelId, setSelectedModelId] =
    useState<string>(DEFAULT_CHAT_MODEL);
  const [input, setInput] = useState<string>("");
  const [status, setStatus] = useState("ready");
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? []
  );

  const loadedIdsRef = useRef<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1); // ASC paging index
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isPaging, setIsPaging] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const conversationIdRef = useRef<string | null>(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const loadMessages = useCallback(
    async (targetConversationId: string) => {
      if (!targetConversationId) return;

      try {
        try {
          // Probe total to compute last page using fixed pageSize=10
          const probe = await Api.getConversationsMessages({
            cid: targetConversationId,
            order: "asc",
            page: 1,
            pageSize: 1,
          });
          const total: number = (probe as any)?.total ?? 0;
          const ps = 10;
          const lastPage = Math.max(1, Math.ceil(total / ps));

          // Load the latest page in ascending order so newest is at the bottom
          const data = await Api.getConversationsMessages({
            cid: targetConversationId,
            order: "asc",
            page: lastPage,
            pageSize: ps,
          });
          const items = Array.isArray((data as any)?.items)
            ? (data as any).items
            : [];
          const history = items.map(mapBackendMessage);
          loadedIdsRef.current = new Set(history.map((m) => m.id));
          setMessages(history);
          setPageSize(ps);
          setCurrentPage(lastPage);
          setHasMore(lastPage > 1);
        } catch (e: any) {
          const isNotFound = /HTTP\s+404/.test(String(e?.message ?? ""));
          if (isNotFound) {
            setMessages([]);
            setHasMore(false);
            return;
          }
          throw e;
        }
      } catch (error) {
        console.error("Failed to load messages", error);
        toast({
          type: "error",
          description:
            error instanceof Error ? error.message : "获取历史消息失败",
        });
      }
    },
    [setMessages]
  );

  // Load older page and prepend to current messages
  const loadOlderPage = useCallback(async () => {
    if (!conversationIdRef.current) return;
    if (isPaging) return;
    if (!hasMore) return;
    try {
      setIsPaging(true);
      const data = await Api.getConversationsMessages({
        cid: conversationIdRef.current,
        order: "asc",
        page: currentPage - 1,
        pageSize: pageSize || 10,
      });
      const items = Array.isArray((data as any)?.items)
        ? (data as any).items
        : [];
      const olderAll = items.map(mapBackendMessage);
      // Deduplicate by id to prevent duplicate keys
      const older = olderAll.filter((m) => {
        if (loadedIdsRef.current.has(m.id)) return false;
        loadedIdsRef.current.add(m.id);
        return true;
      });
      setMessages((prev) => (older.length > 0 ? [...older, ...prev] : prev));
      setCurrentPage((p) => p - 1);
      setHasMore(currentPage - 1 > 1);
    } catch (error) {
      console.error("Failed to load older messages", error);
    } finally {
      setIsPaging(false);
    }
  }, [currentPage, pageSize, isPaging, hasMore]);

  useEffect(() => {
    if (autoResume && conversationId) {
      loadMessages(conversationId);
    }
  }, [autoResume, conversationId, loadMessages]);

  useEffect(() => {
    setSelectedModelId(getChatModelFromCookies());
  }, []);

  useEffect(() => {
    setMessages(initialMessages ?? []);
  }, [initialMessages]);

  // TODO: Issue with displaying tools and reasoning events in an interleaved/chronological order
  // Generic updater: update or create the specified part type on the last assistant message
  const updateLastAssistantPart = useCallback(
    (
      partType: "text" | "reasoning" | "dynamic-tool",
      updater: (previous: string) => string
    ) => {
      setMessages((prevMessages) => {
        if (prevMessages.length === 0) return prevMessages;

        const lastIndex = prevMessages.length - 1;
        const lastMessage = prevMessages[lastIndex];

        if (!lastMessage || lastMessage.role !== "assistant") {
          return prevMessages;
        }

        const parts = Array.isArray(lastMessage.parts)
          ? [...lastMessage.parts]
          : [];
        const idx = parts.findIndex((part) => part?.type === partType);
        const previousText =
          idx >= 0 && typeof (parts[idx] as any)?.text === "string"
            ? (parts[idx] as any).text
            : "";

        let nextText = "";
        try {
          nextText = updater(previousText || "");
        } catch (error) {
          console.error(`Failed to update assistant ${partType}`, error);
          return prevMessages;
        }

        if (nextText === previousText) {
          return prevMessages;
        }

        const nextParts =
          idx >= 0
            ? [
                ...parts.slice(0, idx),
                {
                  ...(parts[idx] ?? { type: partType }),
                  type: partType,
                  text: nextText,
                },
                ...parts.slice(idx + 1),
              ]
            : [
                ...parts,
                {
                  type: partType,
                  text: nextText,
                },
              ];

        const nextMessages = [...prevMessages];
        nextMessages[lastIndex] = {
          ...lastMessage,
          parts: nextParts as ChatMessage["parts"],
        };
        return nextMessages;
      });
    },
    [setMessages]
  );

  const updateAssistantMessage = useCallback(
    (updater: (previous: string) => string) =>
      updateLastAssistantPart("text", updater),
    [updateLastAssistantPart]
  );

  const updateAssistantReasoning = useCallback(
    (updater: (previous: string) => string) =>
      updateLastAssistantPart("reasoning", updater),
    [updateLastAssistantPart]
  );

  const appendAssistantTailReasoning = useCallback(
    (delta: string) => {
      if (!delta) return;
      setMessages((prevMessages) => {
        if (prevMessages.length === 0) return prevMessages;
        const lastIndex = prevMessages.length - 1;
        const lastMessage = prevMessages[lastIndex];
        if (!lastMessage || lastMessage.role !== "assistant") return prevMessages;

        const parts = Array.isArray(lastMessage.parts)
          ? [...lastMessage.parts]
          : [];
        const lastPart = parts[parts.length - 1] as any;
        if (lastPart && lastPart.type === "reasoning") {
          const updated = {
            ...lastPart,
            text: String(lastPart.text ?? "") + delta,
          };
          const nextParts = [...parts.slice(0, -1), updated];
          const nextMessages = [...prevMessages];
          nextMessages[lastIndex] = {
            ...lastMessage,
            parts: nextParts as ChatMessage["parts"],
          };
          return nextMessages;
        }

        const nextParts = [
          ...parts,
          { type: "reasoning", text: delta } as ChatMessage["parts"][number],
        ];
        const nextMessages = [...prevMessages];
        nextMessages[lastIndex] = {
          ...lastMessage,
          parts: nextParts as ChatMessage["parts"],
        };
        return nextMessages;
      });
    },
    [setMessages]
  );

  const appendAssistantDynamicTool = useCallback(
    (toolName: string, output: any) => {
      setMessages((prevMessages) => {
        if (prevMessages.length === 0) return prevMessages;
        const lastIndex = prevMessages.length - 1;
        const lastMessage = prevMessages[lastIndex];
        if (!lastMessage || lastMessage.role !== "assistant") return prevMessages;

        const parts = Array.isArray(lastMessage.parts)
          ? [...lastMessage.parts]
          : [];
        const nextParts = [
          ...parts,
          {
            type: "dynamic-tool",
            toolName,
            state: "output-available",
            output,
          } as ChatMessage["parts"][number],
        ];
        const nextMessages = [...prevMessages];
        nextMessages[lastIndex] = {
          ...lastMessage,
          parts: nextParts as ChatMessage["parts"],
        };
        return nextMessages;
      });
    },
    [setMessages]
  );

  const handleStreamPayload = useCallback(
    (payload: any) => {
      if (!payload) return;

      setDataStream((prev) => [...prev, payload]);

      const eventType = (payload.event ?? payload.type ?? "").toString();

      const appendChunk = (chunk?: string) => {
        if (typeof chunk === "string" && chunk.length > 0) {
          updateAssistantMessage((previous) => `${previous}${chunk}`);
        }
      };

      if (
        eventType === "on_chat_model_stream" ||
        eventType === "on_llm_stream" ||
        eventType === "on_chat_model_stream_chunk" ||
        eventType === "text_delta" ||
        eventType === "delta" ||
        eventType === "chunk"
      ) {
        // 1) Normal visible text delta
        const delta = extractStreamText(payload);
        if (delta) {
          appendChunk(delta);
        }

        // 2) Reasoning delta if present
        const rDelta =
          payload?.chunk?.reasoning ??
          payload?.data?.chunk?.reasoning ??
          (payload?.type === "reasoning-delta" ? payload?.delta : undefined);
        if (typeof rDelta === "string" && rDelta.length > 0) {
          appendAssistantTailReasoning(rDelta);
        }
        return;
      }

      if (eventType === "on_chat_model_end") {
        const finalContent = extractFinalText(payload);
        if (finalContent) {
          updateAssistantMessage(() => finalContent);
        }
        const finalReasoning =
          payload?.data?.output?.reasoning ?? payload?.output?.reasoning;
        if (typeof finalReasoning === "string" && finalReasoning.length > 0) {
          updateAssistantReasoning(() => finalReasoning);
        }
        return;
      }

      if (eventType === "on_tool_end") {
        const toolName = String(payload?.name ?? "tool");
        const toolOutput =
          payload?.data?.output?.content ??
          payload?.data?.output ??
          payload?.output;
        appendAssistantDynamicTool(toolName, toolOutput);
        return;
      }

      if (eventType === "on_chain_error") {
        const message =
          payload?.data?.message ??
          payload?.data?.error ??
          "生成失败，请稍后重试。";
        toast({ type: "error", description: message });
        setStatus("ready");
      }
    },
    [
      appendAssistantDynamicTool,
      appendAssistantTailReasoning,
      setDataStream,
      setStatus,
      updateAssistantMessage,
      updateAssistantReasoning,
    ]
  );

  const openStream = useCallback(
    (cid: string) => {
      if (!cid) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      try {
        const cleanup = () => {
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          setStatus("ready");
        };

        const source = openConversationStream(cid, {
          onEvent: (payload) => {
            // Forward for rendering/aggregation; completion handled by onComplete
            handleStreamPayload(payload);
          },
          onError: () => {
            cleanup();
          },
          onComplete: () => {
            cleanup();
          },
        });
        eventSourceRef.current = source;
        setStatus("streaming");
        // Listeners & completion handled in openConversationStream
      } catch (error) {
        console.error("连接流失败", error);
        setStatus("ready");
        toast({ type: "error", description: "无法连接到生成服务" });
      }
    },
    [handleStreamPayload, loadMessages, setStatus]
  );

  const sendMessage = useCallback(
    async (message: { role: "user"; parts: Array<any> }) => {
      try {
        if (status !== "ready") {
          toast({ type: "error", description: "请等待当前回复结束后再发送" });
          return;
        }

        const content = message.parts
          .filter(
            (part: any) =>
              part?.type === "text" && typeof part.text === "string"
          )
          .map((part: any) => part.text as string)
          .join("\n")
          .trim();

        if (!content) {
          toast({ type: "error", description: "请输入要发送的内容" });
          return;
        }

        setStatus("submitted");
        setDataStream([]);

        const appendUserAndAssistant = (
          userMessageId: string,
          assistantMessageId?: string
        ) => {
          const timestamp = new Date().toISOString();
          const userMessage: ChatMessage = {
            id: userMessageId || generateUUID(),
            role: "user",
            parts: message.parts as ChatMessage["parts"],
            metadata: { createdAt: timestamp },
          };

          setMessages((prev) => [...prev, userMessage]);

          if (assistantMessageId) {
            const assistantMessage: ChatMessage = {
              id: assistantMessageId,
              role: "assistant",
              parts: [
                {
                  type: "text",
                  text: "",
                },
              ] as ChatMessage["parts"],
              metadata: { createdAt: new Date().toISOString() },
            };

            setMessages((prev) => [...prev, assistantMessage]);
          }
        };

        const activeConversationId = conversationIdRef.current;

        if (!activeConversationId) {
          const data = await Api.postConversations({
            requestBody: { content },
          });
          const newConversationId: string | undefined = data?.conversation_id;

          if (!newConversationId) {
            throw new Error("后端未返回会话信息");
          }

          conversationIdRef.current = newConversationId;
          setConversationId(newConversationId);
          window.history.replaceState({}, "", `/chat/${newConversationId}`);

          const userMessageId: string =
            data?.message_start?.user_message_id ?? generateUUID();
          const assistantMessageId: string | undefined =
            data?.message_start?.assistant_message_id;

          appendUserAndAssistant(userMessageId, assistantMessageId);

          if (data?.started && assistantMessageId) {
            openStream(newConversationId);
          } else {
            setStatus("ready");
          }

          return;
        }

        const data = await Api.postConversationsMessages({
          cid: activeConversationId,
          requestBody: { content },
        });
        const userMessageId: string = data?.user_message_id ?? generateUUID();
        const assistantMessageId: string | undefined =
          data?.assistant_message_id;

        appendUserAndAssistant(userMessageId, assistantMessageId);

        if (assistantMessageId) {
          openStream(activeConversationId);
        } else {
          setStatus("ready");
        }
      } catch (error) {
        setStatus("ready");
        const description =
          error instanceof Error ? error.message : "发送消息失败";
        toast({ type: "error", description });
      }
    },
    [
      openStream,
      setConversationId,
      setDataStream,
      setMessages,
      setStatus,
      status,
    ]
  );

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStatus("ready");
    const cid = conversationIdRef.current;
    if (cid) {
      loadMessages(cid);
    }
  }, [loadMessages]);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const regenerate = useCallback<
    UseChatHelpers<ChatMessage>["regenerate"]
  >(async () => {
    toast({
      type: "info",
      description: "当前暂不支持重新生成该回复",
    });
  }, []);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const shouldShowArtifactToggle = isArtifactVisible || messages.length >= 3;

  const handleArtifactToggle = useCallback(() => {
    setArtifact((current) => {
      const nextVisible = !current.isVisible;
      if (!nextVisible) {
        return { ...current, isVisible: false };
      }

      let fallbackBoundingBox = current.boundingBox;
      if (fallbackBoundingBox.width === 0 && typeof window !== "undefined") {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        fallbackBoundingBox = {
          top: Math.max(vh - 200, 0),
          left: Math.max(vw - 280, 0),
          width: 260,
          height: 160,
        };
      }

      return {
        ...current,
        isVisible: true,
        boundingBox: fallbackBoundingBox,
      };
    });
  }, [setArtifact]);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background touch-pan-y overscroll-behavior-contain">
        <ChatHeader />

        <Messages
          chatId={resolvedChatId}
          status={status}
          messages={messages}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          showArtifactToggle={shouldShowArtifactToggle}
          onToggleArtifact={handleArtifactToggle}
          onReachTop={hasMore ? loadOlderPage : undefined}
        />

        <div className="sticky bottom-0 flex gap-2 px-2 md:px-4 pb-3 md:pb-4 mx-auto w-full bg-background max-w-4xl z-[1] border-t-0">
          {!isReadonly && (
            <MultimodalInput
              chatId={resolvedChatId}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              selectedModelId={selectedModelId}
            />
          )}
        </div>
      </div>
      <Artifact
        baseToken={DEFAULT_BASE_TOKEN}
        quoteToken={DEFAULT_QUOTE_TOKEN}
        chainId={DEFAULT_CHAIN_ID}
      />
    </>
  );
}
function normalizeEscapes(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function extractTextFromPythonLiteral(raw: string): string | null {
  const matches = [...raw.matchAll(/'text':\s*'([^']*)'/g)];
  if (matches.length > 0) {
    return normalizeEscapes(matches.map((m) => m[1]).join(""));
  }

  const contentMatch = raw.match(/content='([^']+)'/);
  if (contentMatch) {
    return normalizeEscapes(contentMatch[1]);
  }

  return null;
}

function ensureString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
      trimmed.includes('"')
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        const parsedText = ensureString(parsed);
        if (parsedText) {
          return parsedText;
        }
      } catch (_) {
        // ignore JSON parse errors
      }
    }
    const pythonLiteral = extractTextFromPythonLiteral(value);
    return pythonLiteral ?? normalizeEscapes(value);
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof part?.text === "string"
          ? part.text
          : ""
      )
      .join("");
    return joined.length > 0 ? joined : null;
  }
  if (value && typeof value === "object") {
    // Try common shapes
    if (typeof (value as any).text === "string") {
      return (value as any).text;
    }
    if (Array.isArray((value as any).content)) {
      return ensureString((value as any).content);
    }
    if (typeof (value as any).content === "string") {
      return ensureString((value as any).content);
    }
    if (Array.isArray((value as any).delta)) {
      return ensureString((value as any).delta);
    }
    if (
      Array.isArray((value as any).choices) &&
      (value as any).choices.length > 0
    ) {
      const choice = (value as any).choices[0];
      if (choice?.delta) {
        return ensureString(choice.delta);
      }
      if (choice?.message) {
        return ensureString(choice.message);
      }
    }
  }
  return null;
}

function extractStreamText(payload: any): string | null {
  if (!payload) return null;

  const candidates = [
    payload?.chunk?.content,
    payload?.chunk?.text,
    payload?.chunk?.delta,
    payload?.chunk,
    payload?.data?.chunk?.content,
    payload?.data?.chunk?.text,
    payload?.data?.chunk?.delta,
    payload?.data?.chunk,
    payload?.data?.content,
    payload?.data?.text,
    payload?.delta,
    payload?.content,
  ];

  for (const candidate of candidates) {
    const text = ensureString(candidate);
    if (text && text.length > 0) {
      return text;
    }
  }

  return null;
}

function extractFinalText(payload: any): string | null {
  if (!payload) return null;

  const candidates = [
    payload?.data?.output?.content,
    payload?.data?.output?.text,
    payload?.data?.output,
    payload?.data?.content,
    payload?.data?.text,
    payload?.output?.content,
    payload?.output?.text,
    payload?.output,
    payload?.content,
    payload?.message,
    payload?.delta,
  ];

  for (const candidate of candidates) {
    const text = ensureString(candidate);
    if (text && text.length > 0) {
      return text;
    }
  }

  return null;
}
