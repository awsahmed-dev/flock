"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { toast } from "sonner";
import { useT } from "@/components/i18n/locale-provider";
import {
  Send,
  X,
  Plus,
  ReceiptText,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Inline expense form ──────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: "food", label: "🍜 Food" },
  { value: "accommodation", label: "🏨 Hotel" },
  { value: "transport", label: "🚌 Transport" },
  { value: "activity", label: "🎟️ Activity" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "other", label: "💳 Other" },
];

function ExpenseForm({
  tripId,
  onSent,
  onCancel,
}: {
  tripId: string;
  onSent: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description) return;

    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("body", `/expense ${amount} ${category} ${description}`);
    startTransition(async () => {
      try {
        await sendMessage(fd);
        onSent();
      } catch {
        toast.error(t("chat.failedToPostExpense"));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-orange-50 dark:bg-orange-950/20 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400">
          <ReceiptText className="w-3.5 h-3.5" />
          Log an expense
        </div>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          type="number"
          min="0"
          step="0.01"
          required
          className="w-24 h-8 text-sm"
          autoFocus
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded-md border bg-background px-2 py-1 text-sm h-8"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was it for?"
          required
          className="flex-1 h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={isPending || !amount || !description} className="h-8 px-3">
          Post
        </Button>
      </div>
    </form>
  );
}

// ─── Inline itinerary form ────────────────────────────────────────────────────

function ItineraryForm({
  tripId,
  onSent,
  onCancel,
}: {
  tripId: string;
  onSent: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("body", `/add ${title}`);
    startTransition(async () => {
      try {
        await sendMessage(fd);
        onSent();
      } catch {
        toast.error(t("chat.failedToPost"));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-blue-50 dark:bg-blue-950/20 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
          <MapPin className="w-3.5 h-3.5" />
          Suggest an activity
        </div>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Visit Senso-ji temple"
          required
          className="flex-1 h-8 text-sm"
          autoFocus
        />
        <Button type="submit" size="sm" disabled={isPending || !title} className="h-8 px-3">
          Add
        </Button>
      </div>
    </form>
  );
}

// ─── Reply preview ────────────────────────────────────────────────────────────

export interface ReplyTarget {
  id: string;
  body: string;
  authorName: string;
}

// ─── Main input ───────────────────────────────────────────────────────────────

type ActiveAction = "expense" | "itinerary" | null;

interface Props {
  tripId: string;
  replyTo?: ReplyTarget | null;
  onClearReply?: () => void;
  onAfterSend?: () => void;
  onTyping?: () => void;
  compact?: boolean; // true when inside sidebar
  /** Local-only: a picked photo (data URL) to render inline in the thread. */
  onPickImage?: (dataUrl: string) => void;
}

export function MessageInput({ tripId, replyTo, onClearReply, onAfterSend, onTyping, compact, onPickImage }: Props) {
  const t = useT();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setActionsOpen(false);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPickImage?.(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // Debounced typing broadcast — fires at most once per 2s while typing
  const handleTypingBroadcast = useCallback(() => {
    if (!onTyping) return;
    if (typingTimeoutRef.current) return; // already scheduled
    onTyping();
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [onTyping]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("body", body.trim());
    if (replyTo) fd.set("replyToId", replyTo.id);

    setBody("");
    onClearReply?.();

    startTransition(async () => {
      try {
        await sendMessage(fd);
        onAfterSend?.();
      } catch {
        setBody(body);
        toast.error(t("chat.failedToSend"));
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  function handleActionSent() {
    setActiveAction(null);
    onAfterSend?.();
  }

  return (
    <div className="border-t bg-card px-3 py-2.5 space-y-2">
      {/* Inline action forms */}
      {activeAction === "expense" && (
        <ExpenseForm
          tripId={tripId}
          onSent={handleActionSent}
          onCancel={() => setActiveAction(null)}
        />
      )}
      {activeAction === "itinerary" && (
        <ItineraryForm
          tripId={tripId}
          onSent={handleActionSent}
          onCancel={() => setActiveAction(null)}
        />
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-1.5 text-xs">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-foreground">{replyTo.authorName}: </span>
            <span className="text-muted-foreground truncate">{replyTo.body}</span>
          </div>
          <button onClick={onClearReply} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Text input row */}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
        <button
          type="button"
          onClick={() => setActionsOpen((o) => !o)}
          aria-label={t("chat.moreAction")}
          className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
            actionsOpen ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className={`w-5 h-5 transition-transform ${actionsOpen ? "rotate-45" : ""}`} />
        </button>
        <textarea
          ref={textareaRef}
          data-chat-input
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            // auto-height
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            // broadcast typing
            if (e.target.value) handleTypingBroadcast();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.typeMessage")}
          rows={1}
          className="flex-1 resize-none rounded-xl border bg-muted/40 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          aria-label={t("chat.send")}
          disabled={!body.trim() || isPending}
          className="rounded-xl h-10 w-10 shrink-0 bg-primary hover:opacity-90 border-0 shadow-sm shadow-primary/25 disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Action row — hidden until the user taps + (brief Screen F): the
          default composer is just the input + send. */}
      {actionsOpen && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveAction(activeAction === "expense" ? null : "expense")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
              activeAction === "expense"
                ? "bg-orange-100 border-orange-300 text-orange-700 shadow-sm dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-300"
                : "bg-muted/40 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 text-muted-foreground border-border/60"
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            {t("chat.expenseAction")}
          </button>

          <button
            type="button"
            onClick={() => setActiveAction(activeAction === "itinerary" ? null : "itinerary")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
              activeAction === "itinerary"
                ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
                : "bg-muted/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-muted-foreground border-border/60"
            }`}
          >
            <MapPin className="w-4 h-4" />
            {t("chat.suggestPlaceAction")}
          </button>

          {/* Photo — native picker; rendered inline (local-only for now). */}
          <label className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold cursor-pointer bg-muted/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-muted-foreground border-border/60 transition-all">
            <ImageIcon className="w-4 h-4" />
            {t("chat.photoAction")}
            <input type="file" accept="image/*" capture="environment" hidden onChange={handlePhoto} />
          </label>
        </div>
      )}
    </div>
  );
}
