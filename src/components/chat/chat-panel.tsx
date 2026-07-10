"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { Pin } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import type { RateBundle } from "@/lib/fx";

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
}

interface Message {
  id: string;
  tripId: string;
  userId: string;
  type: string;
  body: string | null;
  metadata: any;
  replyToId: string | null;
  pinned: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  author?: { displayName: string } | null;
  replyTo?: { body: string | null; author?: { displayName: string } | null } | null;
  reactions: Reaction[];
}

interface ReplyTarget {
  id: string;
  body: string;
  authorName: string;
}

interface Props {
  tripId: string;
  userId: string;
  isOwner: boolean;
  messages: Message[];
  /** §10.8: trip base currency + rates for the expense card's ≈ line. */
  tripCurrency?: string;
  fxRates?: RateBundle | null;
}

export function ChatPanel({ tripId, userId, isOwner, messages, tripCurrency, fxRates }: Props) {
  const t = useT();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  // Local-only picked photos (no server upload yet) — rendered inline.
  const [localImages, setLocalImages] = useState<string[]>([]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Poll for new messages every 5s
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);

  const pinnedMessages = messages.filter((m) => m.pinned && !m.deletedAt);
  const regularMessages = messages;

  // Group messages by date
  function formatDateLabel(date: Date): string {
    const today = new Date();
    const d = new Date(date);
    if (d.toDateString() === today.toDateString()) return t("chat.today");
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  }

  let lastDateLabel = "";

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-background">
      {/* Pinned messages bar */}
      {pinnedMessages.length > 0 && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Pin className="w-3 h-3" />
            {t("chat.pinnedCount", { count: pinnedMessages.length })}
          </div>
          {pinnedMessages.slice(0, 2).map((m) => (
            <div key={m.id} className="text-xs text-muted-foreground truncate">
              <span className="font-medium">{m.author?.displayName ?? t("chat.unknownAuthor")}: </span>
              {m.body ?? `[${m.type.replace("_", " ")}]`}
            </div>
          ))}
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {regularMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <span className="text-4xl mb-3">💬</span>
            <p className="font-medium">Start the conversation</p>
            <p className="text-sm mt-1 max-w-xs">
              Paste hotel links or use /expense to log costs
            </p>
          </div>
        )}

        {regularMessages.map((msg) => {
          const dateLabel = formatDateLabel(new Date(msg.createdAt));
          const showLabel = dateLabel !== lastDateLabel;
          lastDateLabel = dateLabel;

          return (
            <div key={msg.id}>
              {showLabel && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2">{dateLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <MessageBubble
                message={msg}
                userId={userId}
                isOwner={isOwner}
                onReply={setReplyTo}
                tripCurrency={tripCurrency}
                fxRates={fxRates}
              />
            </div>
          );
        })}

        {localImages.map((url, i) => (
          <div key={`local-img-${i}`} className="flex justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="max-w-[70%] rounded-2xl border border-border shadow-sm"
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        tripId={tripId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onPickImage={(url) => setLocalImages((prev) => [...prev, url])}
      />
    </div>
  );
}
