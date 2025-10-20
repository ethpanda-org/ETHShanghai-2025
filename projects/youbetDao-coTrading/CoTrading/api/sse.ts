import { OpenAPI } from "@/openapi";
import { BACKEND_BASE_URL } from "@/lib/backend-base";

export const DEFAULT_SSE_EVENTS = [
  "message",
  "on_chat_model_stream",
  "on_llm_stream",
  "on_chat_model_stream_chunk",
  "on_chat_model_start",
  "on_chat_model_end",
  "on_tool_start",
  "on_tool_end",
  "on_chain_start",
  "on_chain_end",
  "on_chain_error",
];

export interface ConversationStreamOptions {
  events?: string[];
  onEvent?: (payload: any, eventName: string) => void;
  onError?: (ev: Event) => void;
  onComplete?: () => void;
  finalAgents?: string[]; // names that indicate top-level graph end
}

export function openConversationStream(
  cid: string,
  opts: ConversationStreamOptions = {}
): EventSource {
  const base = OpenAPI.BASE || BACKEND_BASE_URL;
  const url = `${base}/conversations/${cid}/stream`;
  const source = new EventSource(url);
  const names = opts.events ?? DEFAULT_SSE_EVENTS;
  const final = new Set<string>(
    opts.finalAgents ?? ["ReAct Agent", "Supervisor Agent"]
  );

  const forward = (name: string) => (event: MessageEvent) => {
    if (!event.data) return;
    try {
      const payload = JSON.parse(event.data);
      opts.onEvent?.(payload, name);
      if (payload?.event === "on_chain_end" && final.has(payload?.name)) {
        // Top-level graph finished
        opts.onComplete?.();
      }
    } catch (_) {
      // ignore JSON parse errors
    }
  };

  names.forEach((n) => source.addEventListener(n, forward(n)));
  source.onerror = (ev) => {
    opts.onError?.(ev);
  };
  return source;
}
