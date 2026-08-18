"use client";

import { useEffect, useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown, Check, X, Star, Calendar, CircleNotch as Loader2, Sparkle as Sparkles } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  getDecision,
  voteOnDecision,
  resolveDecisionManually,
  type DecisionState,
} from "@/lib/actions/decisions";
import { useT } from "@/components/i18n/locale-provider";

export interface DecisionCardMeta {
  decisionId: string;
  snapshot: {
    placeId: string;
    name: string;
    category: string;
    rating: number | null;
    userRatingsTotal: number | null;
    priceLevel: number | null;
    photoRef: string | null;
  };
  proposedDay: string | null;
  note: string | null;
  closesAt: string | null;
}

/**
 * Paxawa v2 — the chat decision card (build-spec Part B). A real place with
 * 👍/👎 voting inline in chat, a live tally + countdown, and a resolved state
 * (added to the plan / skipped). Fetches live decision state so votes from the
 * whole crew show up; on a real majority it auto-lands on a day.
 */
export function DecisionCardMessage({ meta, onActionDone }: { meta: DecisionCardMeta; onActionDone?: () => void }) {
  const t = useT();
  const [state, setState] = useState<DecisionState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    getDecision(meta.decisionId).then((s) => alive && setState(s)).catch(() => {});
    return () => { alive = false; };
  }, [meta.decisionId]);

  const photo = meta.snapshot.photoRef
    ? `/api/discover/photo?ref=${encodeURIComponent(meta.snapshot.photoRef)}&w=500`
    : null;
  const price = meta.snapshot.priceLevel != null && meta.snapshot.priceLevel > 0 ? "$".repeat(meta.snapshot.priceLevel) : null;

  function vote(v: "yes" | "no") {
    if (!state || state.status !== "open") return;
    startTransition(async () => {
      try {
        const next = await voteOnDecision(meta.decisionId, v);
        setState(next);
        if (next.status === "passed") toast.success(t("decisions.addedToast"));
        onActionDone?.();
      } catch {
        toast.error(t("decisions.voteError"));
      }
    });
  }

  function manage(outcome: "pass" | "skip") {
    startTransition(async () => {
      try {
        const next = await resolveDecisionManually(meta.decisionId, outcome);
        setState(next);
        onActionDone?.();
      } catch {
        toast.error(t("decisions.voteError"));
      }
    });
  }

  const resolved = state && state.status !== "open";

  return (
    <div className="rounded-2xl ring-1 ring-border/60 bg-card overflow-hidden w-full max-w-sm shadow-sm">
      {/* Place hero */}
      <div className="relative aspect-[16/9] bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={meta.snapshot.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-3xl font-bold text-primary/40">
            {meta.snapshot.name.charAt(0)}
          </div>
        )}
        <span className="absolute top-2.5 start-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur text-white px-2.5 py-1 text-[12px] font-bold">
          <Sparkles className="w-4 h-4" />{t("decisions.label")}
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        <div>
          <p className="font-bold text-[15px] leading-snug line-clamp-1">{meta.snapshot.name}</p>
          <div className="mt-1 flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-muted-foreground">
            {meta.snapshot.rating != null && (
              <span className="inline-flex items-center gap-1 font-bold text-foreground">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{meta.snapshot.rating.toFixed(1)}
              </span>
            )}
            {price && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{price}</span>}
            {meta.proposedDay && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4" />{meta.proposedDay}
              </span>
            )}
          </div>
          {meta.note && <p className="mt-1.5 text-[13px] text-foreground/70 italic">“{meta.note}”</p>}
        </div>

        {!state ? (
          <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : resolved ? (
          <ResolvedBanner state={state} t={t} />
        ) : (
          <>
            {/* Vote buttons */}
            <div className="flex items-center gap-2">
              <VoteButton
                active={state.myVote === "yes"} tone="yes" count={state.yes}
                onClick={() => vote("yes")} disabled={isPending} label={t("decisions.yes")}
              />
              <VoteButton
                active={state.myVote === "no"} tone="no" count={state.no}
                onClick={() => vote("no")} disabled={isPending} label={t("decisions.no")}
              />
            </div>
            {/* Tally + countdown */}
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <span>{t("decisions.votedOf", { voted: state.yes + state.no, total: state.memberCount })}</span>
              {meta.closesAt && <Countdown closesAt={meta.closesAt} t={t} />}
            </div>
            {state.canManage && (
              <div className="flex items-center gap-2 pt-0.5">
                <button type="button" onClick={() => manage("pass")} disabled={isPending}
                  className="flex-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold py-1.5 hover:bg-emerald-500/15 transition-colors">
                  {t("decisions.addNow")}
                </button>
                <button type="button" onClick={() => manage("skip")} disabled={isPending}
                  className="flex-1 rounded-lg bg-muted text-muted-foreground text-xs font-bold py-1.5 hover:bg-muted/70 transition-colors">
                  {t("decisions.skip")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VoteButton({
  active, tone, count, onClick, disabled, label,
}: {
  active: boolean; tone: "yes" | "no"; count: number; onClick: () => void; disabled: boolean; label: string;
}) {
  const Icon = tone === "yes" ? ThumbsUp : ThumbsDown;
  const activeCls = tone === "yes"
    ? "bg-emerald-500 text-white ring-emerald-500"
    : "bg-rose-500 text-white ring-rose-500";
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl ring-1 py-2 text-sm font-bold transition-all ${
        active ? activeCls : "ring-border/60 bg-card text-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="w-4 h-4" />{label}
      <span className="tabular-nums opacity-80">{count}</span>
    </button>
  );
}

function ResolvedBanner({ state, t }: { state: DecisionState; t: (k: string, p?: Record<string, string | number>) => string }) {
  if (state.status === "passed") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-2.5 text-sm font-bold">
        <Check className="w-4.5 h-4.5" />{t("decisions.added")}
      </div>
    );
  }
  if (state.status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold text-muted-foreground">
        <X className="w-4.5 h-4.5" />{t("decisions.withdrawn")}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold text-muted-foreground">
      <X className="w-4.5 h-4.5" />{t("decisions.skipped", { no: state.no, total: state.memberCount })}
    </div>
  );
}

function Countdown({ closesAt, t }: { closesAt: string; t: (k: string, p?: Record<string, string | number>) => string }) {
  const [ms] = useState(() => new Date(closesAt).getTime() - Date.now());
  if (ms <= 0) return <span>{t("decisions.closed")}</span>;
  const hours = Math.floor(ms / 3600000);
  const label = hours >= 1 ? `${hours}h` : `${Math.max(1, Math.floor(ms / 60000))}m`;
  return <span>{t("decisions.closesIn", { time: label })}</span>;
}
