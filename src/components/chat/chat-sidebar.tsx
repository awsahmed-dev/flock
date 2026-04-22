"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageBubble } from "./message-bubble";
import { MessageInput, type ReplyTarget } from "./message-input";
import { X, MessageSquare, RefreshCw, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

interface PresenceUser {
  userId: string;
  displayName: string;
}

interface Props {
  tripId: string;
  tripName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ tripId, tripName, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/chat`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setUserId(data.userId ?? "");
      setDisplayName(data.displayName ?? "");
      setIsOwner(data.isOwner ?? false);
    } catch {
      // silent
    }
  }, [tripId]);

  // ── Realtime: postgres_changes + presence + typing ─────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Initial load
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    // 1. Data channel — react to any INSERT/UPDATE/DELETE on chat tables
    const dataChannel = supabase
      .channel(`chat-data-${tripId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_messages",
        filter: `trip_id=eq.${tripId}`,
      }, () => { fetchMessages(); })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, () => { fetchMessages(); })
      .subscribe();

    return () => {
      supabase.removeChannel(dataChannel);
    };
  }, [isOpen, tripId, fetchMessages, supabase]);

  // 2. Presence + typing channel — depends on userId being set
  useEffect(() => {
    if (!isOpen || !userId) return;

    const presenceChannel = supabase.channel(`chat-presence-${tripId}`, {
      config: { presence: { key: userId } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<PresenceUser>();
        const users = Object.values(state)
          .flat()
          .filter((u) => u.userId !== userId);
        setOnlineUsers(users);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { senderId, senderName } = payload as { senderId: string; senderName: string };
        if (senderId === userId) return;

        setTypingUsers((prev) => ({ ...prev, [senderId]: senderName }));

        // Auto-clear after 3s of silence
        clearTimeout(typingTimers.current[senderId]);
        typingTimers.current[senderId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
        }, 3000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ userId, displayName });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [isOpen, userId, displayName, tripId, supabase]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Broadcast typing — called from MessageInput
  const handleTyping = useCallback(() => {
    if (!userId) return;
    supabase.channel(`chat-presence-${tripId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { senderId: userId, senderName: displayName },
    });
  }, [userId, displayName, tripId, supabase]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  function formatDateLabel(date: Date): string {
    const today = new Date();
    const d = new Date(date);
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  }

  const pinnedMessages = messages.filter((m) => m.pinned && !m.deletedAt);
  const typingList = Object.values(typingUsers);
  let lastDateLabel = "";

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0 bg-gradient-to-r from-primary/5 to-violet-500/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Chat</p>
            <p className="text-xs text-muted-foreground">{tripName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online presence indicator */}
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1">
              <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {onlineUsers.length} online
              </span>
            </div>
          )}

          <button
            onClick={fetchMessages}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinned bar */}
      {pinnedMessages.length > 0 && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-2 shrink-0">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            📌 Pinned ({pinnedMessages.length})
          </p>
          {pinnedMessages.slice(0, 1).map((m) => (
            <p key={m.id} className="text-xs text-muted-foreground truncate">
              <span className="font-medium">{m.author?.displayName ?? "?"}: </span>
              {m.body ?? `[${m.type.replace("_", " ")}]`}
            </p>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-12">
            <span className="text-4xl mb-3">💬</span>
            <p className="font-medium text-sm">Start the conversation</p>
            <p className="text-xs mt-1 max-w-xs leading-relaxed">
              Paste hotel links to get smart actions, or use the buttons below
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const dateLabel = formatDateLabel(new Date(msg.createdAt));
          const showLabel = dateLabel !== lastDateLabel;
          lastDateLabel = dateLabel;

          return (
            <div key={msg.id}>
              {showLabel && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <MessageBubble
                message={msg}
                userId={userId}
                isOwner={isOwner}
                onReply={setReplyTo}
                onActionDone={fetchMessages}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingList.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-muted-foreground">
              {typingList.length === 1
                ? `${typingList[0]} is typing…`
                : `${typingList.slice(0, -1).join(", ")} and ${typingList.at(-1)} are typing…`}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <MessageInput
          tripId={tripId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onAfterSend={fetchMessages}
          onTyping={handleTyping}
          compact
        />
      </div>
    </div>
  );
}
