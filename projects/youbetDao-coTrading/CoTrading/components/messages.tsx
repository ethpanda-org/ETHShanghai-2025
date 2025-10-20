"use client";

import { PreviewMessage, ThinkingMessage } from "./message";
import { Greeting } from "./greeting";
import { memo, useEffect, useRef } from "react";
import equal from "fast-deep-equal";
import { useMessages } from "@/hooks/use-messages";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "./data-stream-provider";
import { Conversation, ConversationContent } from "./elements/conversation";
import { ArrowDownIcon } from "lucide-react";
import { Button } from "./ui/button";

interface MessagesProps {
  chatId: string;
  status: any;
  messages: ChatMessage[];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  showArtifactToggle: boolean;
  onToggleArtifact: () => void;
  onReachTop?: () => Promise<void> | void;
}

function PureMessages({
  chatId,
  status,
  messages,
  isReadonly,
  isArtifactVisible,
  showArtifactToggle,
  onToggleArtifact,
  onReachTop,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);

  useDataStream();

  useEffect(() => {
    if (status === "submitted") {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    }
  }, [status]);

  // Auto-scroll to the latest message when entering the chat
  // or after the initial history load (when messages become non-empty)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const prevLen = (container as any)._prevMessageLen ?? 0;
    if (prevLen === 0 && messages.length > 0) {
      requestAnimationFrame(() => {
        const el = messagesContainerRef.current;
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
        }
      });
    }
    (container as any)._prevMessageLen = messages.length;
  }, [messages.length]);

  // Trigger load more when the user scrolls near the top.
  useEffect(() => {
    const container = messagesContainerRef.current;
    const sentinel = topSentinelRef.current;
    if (!container || !sentinel || !onReachTop) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;

        // Determine anchor: first visible message element
        const containerRect = container.getBoundingClientRect();
        const messageEls = Array.from(
          container.querySelectorAll<HTMLElement>("[data-mid]")
        );
        let anchorEl: HTMLElement | null = null;
        for (const el of messageEls) {
          const r = el.getBoundingClientRect();
          if (r.top >= containerRect.top) {
            anchorEl = el;
            break;
          }
        }
        const anchorId = anchorEl?.getAttribute("data-mid") || null;
        const anchorOffset = anchorEl
          ? anchorEl.getBoundingClientRect().top - containerRect.top
          : 0;

        try {
          await onReachTop();
        } finally {
          // After DOM updates, restore anchor position
          requestAnimationFrame(() => {
            if (anchorId) {
              const el = container.querySelector<HTMLElement>(
                `[data-mid="${anchorId}"]`
              );
              if (el) {
                const newTop =
                  el.getBoundingClientRect().top - containerRect.top;
                const delta = newTop - anchorOffset;
                container.scrollTop += delta;
              }
            }
            isLoadingMoreRef.current = false;
          });
        }
      },
      { root: container, threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onReachTop]);

  return (
    <div
      ref={messagesContainerRef}
      className="overflow-y-scroll flex-1 touch-pan-y overscroll-behavior-contain -webkit-overflow-scrolling-touch"
      style={{ overflowAnchor: "none" }}
    >
      <div
        ref={topSentinelRef}
        data-testid="messages-top-sentinel"
        className="h-px w-full"
      />

      <Conversation className="flex flex-col gap-4 px-2 pt-4 pb-4 mx-auto min-w-0 max-w-4xl md:gap-6 md:px-4">
        <ConversationContent className="flex flex-col gap-4 md:gap-6">
          {messages.length === 0 && <Greeting />}

          {messages.map((message, index) => (
            <PreviewMessage
              key={message.id}
              chatId={chatId}
              message={message}
              isLoading={
                status === "streaming" && messages.length - 1 === index
              }
              isReadonly={isReadonly}
              requiresScrollPadding={
                hasSentMessage && index === messages.length - 1
              }
              isArtifactVisible={isArtifactVisible}
            />
          ))}

          {showArtifactToggle && (
            <div className="flex justify-start">
              <Button variant="outline" onClick={onToggleArtifact}>
                {isArtifactVisible ? "关闭 Artifact" : "Trade Now?"}
              </Button>
            </div>
          )}

          {status === "submitted" &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <ThinkingMessage />
            )}

          <div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
          />
        </ConversationContent>
      </Conversation>

      {!isAtBottom && (
        <button
          className="absolute bottom-40 left-1/2 z-10 p-2 rounded-full border shadow-lg transition-colors -translate-x-1/2 bg-background hover:bg-muted"
          onClick={() => scrollToBottom("smooth")}
          type="button"
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.showArtifactToggle !== nextProps.showArtifactToggle) {
    return false;
  }

  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;
  if (prevProps.isArtifactVisible !== nextProps.isArtifactVisible) return false;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  // if (!equal(prevProps.votes, nextProps.votes)) return false;

  return false;
});
