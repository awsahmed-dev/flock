"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "@/lib/i18n/date-fns";
import {
  deleteMessage,
  toggleReaction,
  togglePin,
  confirmExpenseCard,
  confirmVoteCard,
  confirmLinkToItinerary,
  confirmLinkToVote,
  type LinkCardMeta,
  type ExpenseCardMeta,
  type VoteCardMeta,
} from "@/lib/actions/chat";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Trash2,
  Pin,
  Reply,
  ExternalLink,
  CheckCircle2,
  MapPin,
  FileText,
  Utensils,
  Plane,
  Hotel,
  Ticket,
  ReceiptText,
  Vote,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmartActionChips } from "./smart-action-chips";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "🙌", "✈️"];

const SITE_ICONS: Record<string, React.ReactNode> = {
  hotel: <Hotel className="w-4 h-4" />,
  flight: <Plane className="w-4 h-4" />,
  maps: <MapPin className="w-4 h-4" />,
  docs: <FileText className="w-4 h-4" />,
  restaurant: <Utensils className="w-4 h-4" />,
  activity: <Ticket className="w-4 h-4" />,
  other: <ExternalLink className="w-4 h-4" />,
};

const SITE_LABEL: Record<string, string> = {
  hotel: "Hotel / Accommodation",
  flight: "Flight",
  maps: "Location",
  docs: "Document",
  restaurant: "Restaurant",
  activity: "Activity",
  other: "Link",
};

// ─── Reaction bar ─────────────────────────────────────────────────────────────

function ReactionBar({
  reactions,
  messageId,
  tripId,
  userId,
}: {
  reactions: { emoji: string; userId: string }[];
  messageId: string;
  tripId: string;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const grouped = QUICK_REACTIONS.reduce<Record<string, { count: number; mine: boolean }>>(
    (acc, e) => {
      const matching = reactions.filter((r) => r.emoji === e);
      if (matching.length > 0) {
        acc[e] = { count: matching.length, mine: matching.some((r) => r.userId === userId) };
      }
      return acc;
    },
    {}
  );

  // Also include any non-standard emojis
  reactions.forEach((r) => {
    if (!QUICK_REACTIONS.includes(r.emoji)) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
      grouped[r.emoji].count++;
      if (r.userId === userId) grouped[r.emoji].mine = true;
    }
  });

  function handleReact(emoji: string) {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("messageId", messageId);
    fd.set("emoji", emoji);
    startTransition(async () => {
      try { await toggleReaction(fd); } catch { toast.error("Failed"); }
    });
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          disabled={isPending}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
            mine
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted/50 hover:bg-muted"
          }`}
        >
          {emoji} <span className="tabular-nums">{count}</span>
        </button>
      ))}
      {/* Add reaction picker */}
      <div className="relative group">
        <button className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-muted">
          + React
        </button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-focus-within:flex flex-row gap-1 bg-popover border rounded-xl p-2 shadow-md z-10">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => handleReact(e)}
              disabled={isPending}
              className="hover:scale-125 transition-transform text-base p-0.5"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Link card ────────────────────────────────────────────────────────────────

function LinkCard({
  meta,
  messageId,
  tripId,
  userId,
  onActionDone,
}: {
  meta: LinkCardMeta;
  messageId: string;
  tripId: string;
  userId: string;
  onActionDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [itineraryTitle, setItineraryTitle] = useState(meta.siteName);
  const [voteQuestion, setVoteQuestion] = useState(
    meta.siteType === "hotel" ? `Should we book ${meta.siteName}?` : `Is ${meta.siteName} good?`
  );

  const isConfirmed = !!meta.confirmedAction;

  function handleAddToItinerary() {
    if (showItineraryForm) {
      const fd = new FormData();
      fd.set("tripId", tripId);
      fd.set("messageId", messageId);
      fd.set("title", itineraryTitle);
      fd.set("dayDate", "");
      fd.set("itemType", meta.siteType === "hotel" ? "accommodation" : "activity");
      startTransition(async () => {
        try { await confirmLinkToItinerary(fd); toast.success("Added to itinerary"); onActionDone?.(); }
        catch { toast.error("Failed"); }
      });
    } else {
      setShowItineraryForm(true);
      setShowVoteForm(false);
    }
  }

  function handleStartVote() {
    if (showVoteForm) {
      const fd = new FormData();
      fd.set("tripId", tripId);
      fd.set("messageId", messageId);
      fd.set("question", voteQuestion);
      startTransition(async () => {
        try { await confirmLinkToVote(fd); toast.success("Vote created!"); onActionDone?.(); }
        catch { toast.error("Failed"); }
      });
    } else {
      setShowVoteForm(true);
      setShowItineraryForm(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden w-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/8 to-violet-500/8 border-b">
        <span className="text-primary">{SITE_ICONS[meta.siteType]}</span>
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          {SITE_LABEL[meta.siteType]}
        </span>
        {isConfirmed && (
          <Badge variant="secondary" className="ms-auto text-xs gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            {meta.confirmedAction === "itinerary" ? "Added to itinerary" : "Vote created"}
          </Badge>
        )}
      </div>

      {/* URL preview */}
      <div className="px-4 py-3">
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5 truncate"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {meta.url.replace(/^https?:\/\//, "").slice(0, 60)}
          {meta.url.length > 60 ? "…" : ""}
        </a>
      </div>

      {/* Smart action buttons */}
      {!isConfirmed && (
        <div className="px-4 pb-4 space-y-2">
          {(meta.siteType === "hotel" || meta.siteType === "activity" ||
            meta.siteType === "restaurant" || meta.siteType === "maps") && (
            <>
              {showItineraryForm && (
                <div className="flex gap-2 mb-1">
                  <Input
                    value={itineraryTitle}
                    onChange={(e) => setItineraryTitle(e.target.value)}
                    placeholder="Title for itinerary"
                    className="text-xs h-8"
                  />
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={handleAddToItinerary}
                disabled={isPending}
              >
                <Calendar className="w-3.5 h-3.5 me-1.5" />
                {showItineraryForm ? "Confirm add to itinerary" : "Add to itinerary"}
              </Button>
            </>
          )}

          {(meta.siteType === "hotel" || meta.siteType === "restaurant" || meta.siteType === "activity") && (
            <>
              {showVoteForm && (
                <div className="flex gap-2 mb-1">
                  <Input
                    value={voteQuestion}
                    onChange={(e) => setVoteQuestion(e.target.value)}
                    placeholder="Vote question"
                    className="text-xs h-8"
                  />
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={handleStartVote}
                disabled={isPending}
              >
                <Vote className="w-3.5 h-3.5 me-1.5" />
                {showVoteForm ? "Confirm vote" : "Start vote on this"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Expense card ─────────────────────────────────────────────────────────────

function ExpenseCard({
  meta,
  messageId,
  tripId,
  onActionDone,
}: {
  meta: ExpenseCardMeta;
  messageId: string;
  tripId: string;
  onActionDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isConfirmed = !!meta.confirmedExpenseId;

  function handleConfirm() {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("messageId", messageId);
    startTransition(async () => {
      try { await confirmExpenseCard(fd); toast.success("Expense logged!"); onActionDone?.(); }
      catch (e: any) { toast.error(e?.message || "Failed"); }
    });
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden w-full">
      <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-950/20 border-b">
        <ReceiptText className="w-4 h-4 text-orange-500" />
        <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
          Expense
        </span>
        {isConfirmed && (
          <Badge variant="secondary" className="ms-auto text-xs gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Added to expenses
          </Badge>
        )}
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-xl tabular-nums">${meta.amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
          <span className="text-xs bg-muted rounded-full px-3 py-1 capitalize">
            {meta.category}
          </span>
        </div>
        {!isConfirmed && (
          <Button
            size="sm"
            className="w-full"
            onClick={handleConfirm}
            disabled={isPending}
          >
            <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />
            {isPending ? "Adding…" : "Add to expenses"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Vote card ────────────────────────────────────────────────────────────────

function VoteCardMessage({
  meta,
  messageId,
  tripId,
  onActionDone,
}: {
  meta: VoteCardMeta;
  messageId: string;
  tripId: string;
  onActionDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<string[]>(
    meta.options.length >= 2 ? meta.options : ["Yes", "No"]
  );
  const isConfirmed = !!meta.voteId;

  function handleConfirm() {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("messageId", messageId);
    fd.set("options", JSON.stringify(options.filter((o) => o.trim())));
    startTransition(async () => {
      try { await confirmVoteCard(fd); toast.success("Vote created!"); onActionDone?.(); }
      catch (e: any) { toast.error(e?.message || "Failed"); }
    });
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden w-full">
      <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/20 border-b">
        <Vote className="w-4 h-4 text-purple-500" />
        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
          Vote
        </span>
        {isConfirmed && (
          <Badge variant="secondary" className="ms-auto text-xs gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Vote created
          </Badge>
        )}
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="font-medium">{meta.question}</p>
        {!isConfirmed ? (
          <>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <Input
                  key={i}
                  value={opt}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                  }
                  placeholder={`Option ${i + 1}`}
                  className="text-sm"
                />
              ))}
              <button
                type="button"
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="text-xs text-primary hover:underline"
              >
                + Add option
              </button>
            </div>
            <Button size="sm" className="w-full" onClick={handleConfirm} disabled={isPending}>
              <Vote className="w-3.5 h-3.5 me-1.5" />
              {isPending ? "Creating…" : "Create vote"}
            </Button>
          </>
        ) : (
          <div className="space-y-1">
            {meta.options.map((opt, i) => (
              <div key={i} className="text-sm px-3 py-2 rounded-lg border bg-muted/40">
                {opt}
              </div>
            ))}
            <a
              href={`/trips/${tripId}/votes`}
              className="text-xs text-primary hover:underline block mt-2"
            >
              View vote →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main bubble ──────────────────────────────────────────────────────────────

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

interface Props {
  message: Message;
  userId: string;
  isOwner: boolean;
  onReply: (target: { id: string; body: string; authorName: string }) => void;
  onActionDone?: () => void;
  /** Map of userId → last_read_chat_at ISO. Used to render ✓/✓✓ on outgoing. */
  readReceipts?: Record<string, string | null>;
}

const CARD_TYPES = ["link_card", "expense_card", "vote_card", "itinerary_card", "decision_card"];

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-blue-500",
  "from-fuchsia-400 to-violet-500",
];

function getAvatarGradient(userId: string) {
  const hash = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function MessageBubble({
  message,
  userId,
  isOwner,
  onReply,
  onActionDone,
  readReceipts,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const isMine = message.userId === userId;
  const isCard = CARD_TYPES.includes(message.type);

  // Read-receipt: ✓✓ if any *other* member's last_read_chat_at is at or
  // after this message's createdAt. ✓ otherwise (sent but not yet read).
  const readByOther = (() => {
    if (!isMine || !readReceipts) return false;
    const created = new Date(message.createdAt).getTime();
    for (const [uid, iso] of Object.entries(readReceipts)) {
      if (uid === userId || !iso) continue;
      if (new Date(iso).getTime() >= created) return true;
    }
    return false;
  })();

  if (message.deletedAt) {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-muted-foreground italic">Message deleted</span>
      </div>
    );
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("tripId", message.tripId);
    fd.set("messageId", message.id);
    startTransition(async () => {
      try { await deleteMessage(fd); } catch { toast.error("Failed to delete"); }
    });
  }

  function handlePin() {
    const fd = new FormData();
    fd.set("tripId", message.tripId);
    fd.set("messageId", message.id);
    startTransition(async () => {
      try { await togglePin(fd); } catch { toast.error("Failed"); }
    });
  }

  function handleReply() {
    onReply({
      id: message.id,
      body: message.body || "[card]",
      authorName: message.author?.displayName ?? "Unknown",
    });
  }

  return (
    <div className={`flex gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(message.userId)} flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1 shadow-sm`}>
        {(message.author?.displayName ?? "?")[0].toUpperCase()}
      </div>

      <div className={`space-y-1 ${isCard ? "flex-1 min-w-0" : "max-w-[75%]"} ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {/* Author + time */}
        <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="font-medium text-foreground">
            {isMine ? "You" : message.author?.displayName ?? "Unknown"}
          </span>
          <span>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</span>
          {message.pinned && (
            <span className="text-amber-500">📌</span>
          )}
          {/* Read receipt: ✓ sent / ✓✓ read by at least one other member.
              Only shown on the user's own messages. */}
          {isMine && (
            <span
              className={`text-[10px] font-bold leading-none tracking-tighter ${
                readByOther ? "text-sky-500" : "text-muted-foreground/60"
              }`}
              title={readByOther ? "Read" : "Sent"}
            >
              {readByOther ? "✓✓" : "✓"}
            </span>
          )}
        </div>

        {/* Reply context */}
        {message.replyTo && (
          <div className="text-xs bg-muted/60 rounded-lg px-3 py-1.5 border-l-2 border-muted-foreground/30 max-w-full">
            <span className="font-medium">{message.replyTo.author?.displayName ?? "Unknown"}: </span>
            <span className="text-muted-foreground truncate">{message.replyTo.body ?? "[card]"}</span>
          </div>
        )}

        {/* Message content */}
        {message.type === "text" && message.body && (
          <>
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isMine
                  ? "bg-gradient-to-br from-primary to-violet-600 text-white rounded-tr-sm shadow-sm shadow-primary/20"
                  : "bg-muted rounded-tl-sm"
              }`}
            >
              {message.body}
            </div>
            {/* AI smart-action chips: only on the user's own freshly-sent
                messages — Claude Haiku detects intent and offers 1-tap
                "Add to plan / Log expense / Open vote" actions. */}
            {isMine && (
              <SmartActionChips
                tripId={message.tripId}
                messageId={message.id}
                body={message.body}
                createdAt={message.createdAt}
              />
            )}
          </>
        )}

        {message.type === "link_card" && message.metadata && (
          <LinkCard
            meta={message.metadata as LinkCardMeta}
            messageId={message.id}
            tripId={message.tripId}
            userId={userId}
            onActionDone={onActionDone}
          />
        )}

        {message.type === "expense_card" && message.metadata && (
          <ExpenseCard
            meta={message.metadata as ExpenseCardMeta}
            messageId={message.id}
            tripId={message.tripId}
            onActionDone={onActionDone}
          />
        )}

        {message.type === "vote_card" && message.metadata && (
          <VoteCardMessage
            meta={message.metadata as VoteCardMeta}
            messageId={message.id}
            tripId={message.tripId}
            onActionDone={onActionDone}
          />
        )}

        {/* Reactions */}
        <ReactionBar
          reactions={message.reactions}
          messageId={message.id}
          tripId={message.tripId}
          userId={userId}
        />
      </div>

      {/* Actions (hover) */}
      <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2 ${isMine ? "flex-row-reverse" : ""}`}>
        <button
          onClick={handleReply}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            }
          />
          <DropdownMenuContent align={isMine ? "end" : "start"} className="w-40">
            <DropdownMenuItem
              render={<button className="w-full text-left" />}
              onClick={handleReply}
            >
              <Reply className="w-3.5 h-3.5 me-2" />
              Reply
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem
                render={<button className="w-full text-left" />}
                onClick={handlePin}
                disabled={isPending}
              >
                <Pin className="w-3.5 h-3.5 me-2" />
                {message.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
            {(isMine || isOwner) && (
              <DropdownMenuItem
                render={<button className="w-full text-left text-destructive" />}
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="w-3.5 h-3.5 me-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
