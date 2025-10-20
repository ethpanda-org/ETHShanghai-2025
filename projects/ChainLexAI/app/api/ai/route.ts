import { NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/ai";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key is not configured on the server" },
      { status: 500 },
    );
  }

  const { messages, model } = (await request.json()) as {
    messages: ChatMessage[];
    model?: string;
  };

  if (!messages?.length) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://chainlex.ai",
      "X-Title": "ChainLex.ai",
    },
    body: JSON.stringify({
      model: model ?? "qwen/qwen3-coder:free",
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Failed to contact OpenRouter", details: errorText },
      { status: 500 },
    );
  }

  const payload = await response.json();
  const content: string | undefined = payload.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json(
      { error: "OpenRouter returned an empty response" },
      { status: 500 },
    );
  }

  return NextResponse.json({ content });
}
