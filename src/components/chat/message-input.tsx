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
  Vote,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// ─── Inline vote form ─────────────────────────────────────────────────────────

function VoteForm({
  tripId,
  onSent,
  onCancel,
}: {
  tripId: string;
  onSent: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (!question || validOptions.length < 2) return;

    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("body", `/vote ${question}`);
    startTransition(async () => {
      try {
        await sendMessage(fd);
        onSent();
      } catch {
        toast.error(t("chat.failedToPostVote"));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-purple-50 dark:bg-purple-950/20 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400">
          <Vote className="w-3.5 h-3.5" />
          Create a vote
        </div>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="What should the group decide?"
        required
        className="h-8 text-sm"
        autoFocus
      />
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
              }
              placeholder={`Option ${i + 1}`}
              className="flex-1 h-8 text-sm"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOptions((prev) => [...prev, ""])}
          className="text-xs text-primary hover:underline"
        >
          + Add option
        </button>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !question || options.filter((o) => o.trim()).length < 2}
          className="h-8 px-3"
        >
          Post vote
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
}

export function MessageInput({ tripId, replyTo, onClearReply, onAfterSend, onTyping, compact }: Props) {
  const t = useT();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="border-t bg-background px-3 py-2.5 space-y-2">
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
          className="rounded-xl h-10 w-10 shrink-0 bg-gradient-to-br from-primary to-violet-600 hover:opacity-90 border-0 shadow-sm shadow-primary/25 disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Action buttons row — bumped from ~24px chips to a 36px+ pill so
          they clear a comfortable thumb target; icons up to 16px. */}
      <div className="flex items-center gap-1.5">
        {/* Always-visible primary actions */}
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

        {/* Suggest place — replaces the retired Vote action (§0). Opens the
            place-suggestion form which drops a place into the chat thread. */}
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

        <span className="ms-auto text-[10px] text-muted-foreground hidden sm:block">
          {t("chat.enterToSend")}
        </span>
      </div>
    </div>
  );
}
