type AnyRecord = Record<string, any>;

function pushReasoning(parts: AnyRecord[], delta: string) {
  if (!delta) return;
  const last = parts[parts.length - 1];
  if (last && last.type === "reasoning") {
    last.text = String(last.text ?? "") + delta;
  } else {
    parts.push({ type: "reasoning", text: delta });
  }
}

export function partsFromEvents(
  events: Array<AnyRecord> | null | undefined
): AnyRecord[] {
  if (!Array.isArray(events)) return [];

  const parts: AnyRecord[] = [];

  for (const event of events) {
    const eventType = event?.event;

    if (
      eventType === "on_chat_model_stream" ||
      eventType === "on_llm_stream" ||
      eventType === "on_chat_model_stream_chunk"
    ) {
      const reasoningContent =
        event?.chunk?.reasoning ??
        event?.data?.chunk?.reasoning ??
        event?.reasoning;
      if (typeof reasoningContent === "string" && reasoningContent.length > 0) {
        pushReasoning(parts, reasoningContent);
      }
      continue;
    }

    if (eventType === "on_chat_model_end") {
      const finalReasoning =
        event?.data?.output?.reasoning ?? event?.output?.reasoning;
      if (typeof finalReasoning === "string" && finalReasoning.length > 0) {
        const last = parts[parts.length - 1];
        if (last && last.type === "reasoning") {
          last.text = finalReasoning;
        } else {
          parts.push({ type: "reasoning", text: finalReasoning });
        }
      }
      continue;
    }

    if (eventType === "on_tool_end") {
      const toolName = String(event?.name ?? "tool");
      const output =
        event?.data?.output?.content ?? event?.data?.output ?? event?.output;
      parts.push({
        type: "dynamic-tool",
        toolName,
        state: "output-available",
        output,
      });
      continue;
    }
  }

  return parts;
}
