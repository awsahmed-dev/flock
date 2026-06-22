"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Compass } from "lucide-react";
import { DecisionCardMessage, type DecisionCardMeta } from "@/components/chat/decision-card-message";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface LensRow {
  meta: DecisionCardMeta;
  status: string;
  needsMyVote: boolean;
  createdAt: string;
}

type Tab = "mine" | "open" | "decided";

/**
 * Paxawa v2 — the Decisions lens (build-spec S4.3). Retires the standalone
 * Votes page: every decision in the trip, surfaced as the same card the crew
 * sees in chat, defaulting to the ones still waiting on *your* vote. Voting is
 * inline (the card owns its own live state) so this is a true lens over chat,
 * not a second source of truth.
 */
export function DecisionsBoard({ tripId, rows }: { tripId: string; rows: LensRow[] }) {
  const t = useT();
  const router = useRouter();

  const mine = useMemo(() => rows.filter((r) => r.needsMyVote), [rows]);
  const open = useMemo(() => rows.filter((r) => r.status === "open"), [rows]);
  const decided = useMemo(() => rows.filter((r) => r.status !== "open"), [rows]);

  // Land on "your turn" when there's anything to vote on, else the open list.
  const [tab, setTab] = useState<Tab>(mine.length > 0 ? "mine" : "open");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "mine", label: t("decisions.tabNeedsYou"), count: mine.length },
    { id: "open", label: t("decisions.tabOpen"), count: open.length },
    { id: "decided", label: t("decisions.tabDecided"), count: decided.length },
  ];

  const shown = tab === "mine" ? mine : tab === "open" ? open : decided;

  // Full-empty state — no decisions exist at all yet.
  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-[680px]">
        <Header t={t} />
        <div className="mt-8 rounded-3xl ring-1 ring-border/60 bg-card px-6 py-14 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="mt-4 font-bold text-lg">{t("decisions.lensEmptyTitle")}</p>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
            {t("decisions.lensEmptyBody")}
          </p>
          <Link
            href={`/trips/${tripId}/discover`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Compass className="w-4 h-4" />
            {t("decisions.lensEmptyCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[980px]">
      <Header t={t} />

      {/* Segmented filter — the lens. */}
      <div className="mt-5 inline-flex items-center gap-1 rounded-2xl bg-muted/60 p-1.5">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors",
              tab === tb.id
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tb.label}
            {tb.count > 0 && (
              <span
                className={cn(
                  "min-w-[20px] rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                  tab === tb.id ? "bg-primary/10 text-primary" : "bg-foreground/10 text-muted-foreground",
                )}
              >
                {tb.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("decisions.filterEmpty")}</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <DecisionCardMessage
              key={r.meta.decisionId}
              meta={r.meta}
              onActionDone={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-[1.9rem] font-extrabold tracking-[-0.02em] leading-tight">
        {t("decisions.lensTitle")}
      </h1>
      <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">{t("decisions.lensSubtitle")}</p>
    </div>
  );
}
