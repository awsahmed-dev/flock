"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Receipt as ReceiptText, CheckSquareOffset as Vote, Sparkle as Sparkles } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { applyDetectedAction } from "@/lib/actions/smart-actions";

type DetectedAction =
  | {
      kind: "itinerary";
      title: string;
      type: "activity" | "meal" | "accommodation" | "transport";
      cost?: number;
      locationName?: string;
    }
  | {
      kind: "expense";
      title: string;
      amount: number;
      category: string;
    }
  | {
      kind: "vote";
      question: string;
      options: string[];
    };

interface Props {
  tripId: string;
  messageId: string;
  body: string;
  /** Created-at timestamp — chips only show for messages < 30 min old */
  createdAt: Date | string;
}

const KIND_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  itinerary: { icon: Calendar, label: "Add to plan", color: "text-primary" },
  expense: { icon: ReceiptText, label: "Log expense", color: "text-emerald-500" },
  vote: { icon: Vote, label: "Open a vote", color: "text-violet-500" },
};

const STALE_MS = 30 * 60 * 1000;
const STORAGE_PREFIX = "paxawa:ai-chips-dismissed:";

/**
 * AI-powered chip row that appears below the user's own freshly-sent text
 * messages. Calls /api/ai/detect-actions on mount; if Claude Haiku finds 1-2
 * actionable suggestions, renders chips. Tapping a chip commits the action
 * via applyDetectedAction with sane defaults.
 *
 * Cost guard: only fires for messages < 30 min old, dedupes via in-memory
 * cache on the API side, and persists "dismissed" per message in
 * localStorage so re-renders don't re-classify.
 */
export function SmartActionChips({ tripId, messageId, body, createdAt }: Props) {
  const router = useRouter();
  const [actions, setActions] = useState<DetectedAction[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Skip stale messages
    const age = Date.now() - new Date(createdAt).getTime();
    if (age > STALE_MS) return;

    // Skip if already dismissed
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem(STORAGE_PREFIX + messageId)) {
          setHidden(true);
          return;
        }
      } catch {
        // ignore
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/detect-actions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tripId, body }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { actions?: DetectedAction[] };
        if (cancelled) return;
        setActions(data.actions?.slice(0, 2) ?? []);
      } catch {
        // silent — soft-fail
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, messageId, body, createdAt]);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_PREFIX + messageId, "1");
    } catch {
      // ignore
    }
    setHidden(true);
  }

  function handleApply(action: DetectedAction) {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("kind", action.kind);
    fd.set("payload", JSON.stringify(action));
    startTransition(async () => {
      try {
        await applyDetectedAction(fd);
        toast.success(
          action.kind === "itinerary"
            ? "Added to plan"
            : action.kind === "expense"
              ? "Expense logged"
              : "Vote opened",
        );
        // Tester finding: chip → server insert worked, but switching to
        // the expenses / votes / itinerary tab still showed stale data
        // because the destination route was hydrated from a cached RSC
        // payload. router.refresh() forces Next to refetch the currently
        // mounted segment so when the user jumps tabs the new artifact
        // is already there.
        router.refresh();
        handleDismiss();
      } catch (e: any) {
        toast.error(e?.message || "Failed");
      }
    });
  }

  if (hidden || !actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 -ms-0.5">
      <Sparkles className="w-3 h-3 text-primary/60 ms-1" />
      {actions.map((action, idx) => {
        const meta = KIND_META[action.kind];
        if (!meta) return null;
        const Icon = meta.icon;
        const subtitle =
          action.kind === "itinerary"
            ? action.title
            : action.kind === "expense"
              ? `${action.title} · $${action.amount}`
              : action.question;
        return (
          <button
            key={`${messageId}-${idx}`}
            type="button"
            disabled={isPending}
            onClick={() => handleApply(action)}
            title={subtitle}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Icon className={`w-3 h-3 ${meta.color}`} />
            <span>{meta.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={handleDismiss}
        className="text-[10px] text-muted-foreground/70 hover:text-foreground px-1.5 transition-colors"
      >
        dismiss
      </button>
    </div>
  );
}
