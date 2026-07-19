"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { Star, Plus, Users, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ThreadSheet } from "@/components/huddle/thread-sheet";
import { reactToDecision, createPoll, votePoll } from "@/lib/actions/huddle";
import { createClient } from "@/lib/supabase/client";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { useT } from "@/components/i18n/locale-provider";
import type { CockpitCrew } from "@/components/trips/cockpit/types";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { type DocumentCardData } from "@/components/documents/document-card";
import { DocsPanel } from "@/components/documents/docs-panel";
import { motion } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";

/**
 * Phase 6 §4 — the Huddle surface. Zone 1: Decision Deck (scroll-snap,
 * "NEEDS YOU"). Zone 2: Pulse feed (reverse-chron, realtime, day
 * separators). No text composer anywhere — decisions and moves are the
 * only inputs (§4-B: DO NOT BUILD a chat input).
 */

export interface HuddleDecision {
  id: string;
  type: string;
  placeId: string | null;
  placeName: string | null;
  placePhotoUrl: string | null;
  placeRating: number | null;
  placeCategory: string | null;
  placeNeighborhood: string | null;
  suggestedDay: string | null;
  pollQuestion: string | null;
  pollOptions: { id: string; label: string; voterIds: string[] }[] | null;
  createdByName: string;
  reactions: { reaction: string; userId: string; name: string; avatarUrl: string | null }[];
}

export interface PulseItem {
  id: string;
  eventType: string;
  actorName: string;
  actorAvatar: string | null;
  placeName: string | null;
  placePhotoUrl: string | null;
  amount: number | null;
  amountBase: number | null;
  currency: string | null;
  isSystem: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function HuddleBoard({
  tripId, tripName, currency, currentUserId, crew, decisions, pulse, openCompose,
  packing = { packed: 0, total: 0 }, showPrepRow = false,
  documents = [], initialTab = "decisions",
}: {
  tripId: string;
  tripName: string;
  currency: string;
  currentUserId: string;
  crew: CockpitCrew[];
  decisions: HuddleDecision[];
  pulse: PulseItem[];
  openCompose?: boolean;
  /** Phase 7 §7-A: packing status for the Prep row. */
  packing?: { packed: number; total: number };
  /** Only during PLANNING/DEPARTURE — irrelevant once departed. */
  showPrepRow?: boolean;
  /** Sprint 6 FIX-1: Huddle is the coordination hub — docs live here. */
  documents?: DocumentCardData[];
  initialTab?: "decisions" | "docs";
}) {
  const t = useT();
  const router = useRouter();
  const [feed, setFeed] = useState(pulse);
  const [newPill, setNewPill] = useState(false);
  const [pollOpen, setPollOpen] = useState(openCompose ?? false);
  // Sprint 6 FIX-1: Decisions | Docs segments. ?tab=docs deep-links Docs.
  const [seg, setSeg] = useState<"decisions" | "docs">(initialTab);
  const sortedDocs = [...documents].sort((a, b) => {
    if (a.dayDate && b.dayDate) return a.dayDate.localeCompare(b.dayDate);
    if (a.dayDate) return -1;
    if (b.dayDate) return 1;
    return 0;
  });
  const [thread, setThread] = useState<{ entityType: "place"; entityId: string; title: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep local feed in sync with server revalidations.
  const [synced, setSynced] = useState(pulse);
  if (pulse !== synced) {
    setSynced(pulse);
    setFeed(pulse);
  }

  // §4-B realtime: prepend inserts; show the "↑ New activity" pill when
  // the user is scrolled away from the top.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pulse-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities", filter: `trip_id=eq.${tripId}` },
        () => {
          router.refresh();
          if ((scrollRef.current?.scrollTop ?? 0) > 200 || window.scrollY > 200) setNewPill(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  // Poll composer opens from the nav's "Ask the crew" too.
  useEffect(() => {
    const open = () => setPollOpen(true);
    window.addEventListener("paxawa:openPollComposer", open);
    return () => window.removeEventListener("paxawa:openPollComposer", open);
  }, []);

  // Day-grouped pulse.
  const grouped = useMemo(() => {
    const groups: { day: string; items: PulseItem[] }[] = [];
    for (const item of feed) {
      const day = dfFormat(new Date(item.createdAt), "EEEE, d MMMM");
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(item);
      else groups.push({ day, items: [item] });
    }
    return groups;
  }, [feed]);

  const solo = crew.length < 2;

  return (
    <main className="bg-background text-foreground min-h-svh" ref={scrollRef}>
      {newPill && (
        <button
          type="button"
          onClick={() => {
            setNewPill(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 rounded-full bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2 flex items-center gap-1 shadow-lg"
        >
          <ArrowUp size={14} /> {t("huddle.newActivity")}
        </button>
      )}

      <div
        className="max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
      >
        {/* Sprint 6 FIX-1: Huddle = the full coordination hub. */}
        <SegmentedControl<"decisions" | "docs">
          aria-label="Huddle sections"
          value={seg}
          onChange={setSeg}
          options={[
            { value: "decisions", label: t("huddle.tabDecisions") },
            { value: "docs", label: t("huddle.tabDocs") },
          ]}
        />

        {seg === "docs" ? (
          /* Sprint 8 Item 1: list/grid toggle + in-app viewer live in the
             shared DocsPanel. */
          <DocsPanel tripId={tripId} docs={sortedDocs} />
        ) : (
        <>
        {/* ── ZONE 1: Decision Deck. ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-bold uppercase text-tertiary" style={{ letterSpacing: 1.5 }}>
              {t("huddle.needsYou")} · {decisions.length}
            </p>
            <button
              type="button"
              onClick={() => setPollOpen(true)}
              aria-label="Ask the crew"
              className="w-11 h-11 -me-2 flex items-center justify-center text-primary"
            >
              <Plus size={18} />
            </button>
          </div>
          {decisions.length === 0 ? (
            <div className="h-11 flex items-center px-1 text-[13px] text-muted-foreground">
              {t("huddle.noOpenDecisions")}
            </div>
          ) : (
            <DecisionDeck
              tripId={tripId}
              decisions={decisions}
              currentUserId={currentUserId}
              crewSize={crew.length}
              onDiscuss={(d) =>
                d.placeId && setThread({ entityType: "place", entityId: d.placeId, title: d.placeName ?? "Place" })
              }
            />
          )}
        </section>

        {/* ── Phase 7 §7-A: Prep row — packing status leads into /pack. ── */}
        {showPrepRow && (
          <>
            <div aria-hidden className="h-px bg-border -mx-4" />
            <Link
              href={`/trips/${tripId}/pack`}
              className="flex items-center gap-3 h-[52px] px-4 rounded-2xl bg-card border border-border"
            >
              <span aria-hidden>🧳</span>
              <span className="text-[15px] font-semibold text-foreground whitespace-nowrap">
                {t("huddle.prepPacking", { packed: packing.packed, total: packing.total })}
              </span>
              <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <span
                  className="block h-full rounded-full"
                  style={{ background: "var(--clr-moss)", width: `${packing.total > 0 ? Math.round((packing.packed / packing.total) * 100) : 0}%` }}
                />
              </span>
              <span className="text-[13px] font-bold text-primary whitespace-nowrap">{t("huddle.prepPack")}</span>
            </Link>
            <div aria-hidden className="h-px bg-border -mx-4" />
          </>
        )}

        {/* ── ZONE 2: Pulse. ─────────────────────────────────────────── */}
        <section>
          <p className="text-[12px] font-bold uppercase text-tertiary mb-2" style={{ letterSpacing: 1.5 }}>
            {t("huddle.pulse")}
          </p>
          {feed.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-5 text-center">
              {solo ? (
                <>
                  <p className="font-semibold">{t("huddle.quietTitle")}</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t("huddle.quietBody")}
                  </p>
                  <Link
                    href={`/trips/${tripId}/members`}
                    className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2"
                  >
                    <Users size={14} /> {t("huddle.inviteCrew")}
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-semibold">{t("huddle.movesTitle")}</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {t("huddle.movesBody")}
                  </p>
                  <Link
                    href={`/trips/${tripId}/discover`}
                    className="inline-block mt-3 rounded-full bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2"
                  >
                    {t("huddle.openDiscover")}
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {grouped.map((g) => (
                <div key={g.day}>
                  <p className="sticky top-[52px] z-10 py-1 text-[11px] font-semibold text-tertiary bg-background">
                    {g.day}
                  </p>
                  <div className="rounded-3xl bg-card border border-border divide-y divide-border/60 overflow-hidden">
                    {g.items.map((a) => (
                      <ActivityCard key={a.id} item={a} currency={currency} tripId={tripId} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </>
        )}
      </div>

      <PollComposer
        tripId={tripId}
        open={pollOpen}
        onClose={() => {
          setPollOpen(false);
          // QA BUG-10: drop ?compose=poll so a post-revalidate remount can't
          // re-initialize the sheet open.
          if (typeof window !== "undefined" && window.location.search.includes("compose=poll")) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }}
      />
      {thread && (
        <ThreadSheet
          tripId={tripId}
          entityType={thread.entityType}
          entityId={thread.entityId}
          title={thread.title}
          crew={crew}
          onClose={() => setThread(null)}
        />
      )}
    </main>
  );
}

/* ── Decision Deck (§4-A) ───────────────────────────────────────────────── */

function DecisionDeck({
  tripId, decisions, currentUserId, crewSize, onDiscuss,
}: {
  tripId: string;
  decisions: HuddleDecision[];
  currentUserId: string;
  crewSize: number;
  onDiscuss: (d: HuddleDecision) => void;
}) {
  // Visual-fix brief D: the deck rides Embla + motion (Animate UI
  // MotionCarousel pattern) — active card scales up, inactive settle back,
  // animated pill pagination below. DecisionCard itself is untouched.
  const [active, setActive] = useState(0);
  const shown = decisions.slice(0, 5);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    direction: typeof document !== "undefined" && document.dir === "rtl" ? "rtl" : "ltr",
  });
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActive(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);
  const deckSpring = { type: "spring", stiffness: 240, damping: 24 } as const;

  return (
    <div>
      <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
        <div className="flex touch-pan-y gap-3">
          {shown.map((d, i) => (
            <motion.div
              key={d.id}
              className="min-w-0 flex-none basis-[calc(100%-32px)]"
              initial={false}
              animate={{ scale: i === active ? 1 : 0.94 }}
              transition={deckSpring}
            >
              <DecisionCard
                tripId={tripId}
                decision={d}
                currentUserId={currentUserId}
                crewSize={crewSize}
                onDiscuss={() => onDiscuss(d)}
              />
            </motion.div>
          ))}
        </div>
      </div>
      {shown.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2">
          {shown.map((_, i) => (
            <motion.button
              key={i}
              type="button"
              aria-label={`Decision ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full ${i === active ? "bg-primary" : "bg-muted"}`}
              initial={false}
              animate={{ width: i === active ? 20 : 8, height: 8 }}
              transition={deckSpring}
            />
          ))}
        </div>
      )}
      {decisions.length > 5 && (
        <p className="text-center text-[12px] text-muted-foreground mt-1">…and {decisions.length - 5} more</p>
      )}
    </div>
  );
}

function DecisionCard({
  tripId, decision, currentUserId, crewSize, onDiscuss,
}: {
  tripId: string;
  decision: HuddleDecision;
  currentUserId: string;
  crewSize: number;
  onDiscuss: () => void;
}) {
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(decision.reactions);

  function react(reaction: "add_it" | "love" | "discuss" | "approve") {
    if (reaction === "discuss") {
      onDiscuss();
      return;
    }
    const mine = local.some((r) => r.userId === currentUserId && r.reaction === reaction);
    setLocal((prev) =>
      mine
        ? prev.filter((r) => !(r.userId === currentUserId && r.reaction === reaction))
        : [...prev, { reaction, userId: currentUserId, name: "You", avatarUrl: null }],
    );
    if (navigator.vibrate) navigator.vibrate(8);
    startTransition(() => {
      reactToDecision(decision.id, tripId, reaction)
        .then((res) => {
          if (res.resolved) toast.success(`✈️ Going in the plan — added${decision.suggestedDay ? "" : " to day 1"}`);
        })
        .catch(() => {
          setLocal(decision.reactions);
          toast.error("That didn't save — try again");
        });
    });
  }

  if (decision.type === "poll" && decision.pollOptions) {
    return (
      <PollCard tripId={tripId} decision={decision} currentUserId={currentUserId} crewSize={crewSize} />
    );
  }

  // CrewSuggestion (default chassis for the rest).
  const buttons: { key: "add_it" | "love" | "discuss"; label: string }[] = [
    { key: "add_it", label: "✈️ Add it" },
    { key: "love", label: "❤️ Love" },
    { key: "discuss", label: "🤔 Discuss" },
  ];

  return (
    <article className="rounded-3xl bg-card border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
      {decision.placePhotoUrl && (
        <div className="relative aspect-[4/3] bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={decision.placePhotoUrl} alt={decision.placeName ?? ""} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <p className="text-[17px] font-bold">{decision.placeName ?? "Suggestion"}</p>
        <p className="text-[13px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
          {decision.placeRating != null && (
            <>
              <Star size={12} className="fill-amber-400 text-amber-400" /> {decision.placeRating.toFixed(1)} ·{" "}
            </>
          )}
          {[decision.placeCategory, decision.placeNeighborhood].filter(Boolean).join(" · ")}
        </p>
        <p className="text-[12px] text-muted-foreground mt-1.5">Suggested by {decision.createdByName.split(" ")[0]}</p>
      </div>
      <div className="grid grid-cols-3 border-t border-border/60">
        {buttons.map((b) => {
          const voters = local.filter((r) => r.reaction === b.key);
          const cast = voters.some((r) => r.userId === currentUserId);
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => react(b.key)}
              className={`h-12 flex flex-col items-center justify-center text-[13px] font-semibold active:scale-95 transition-transform ${
                cast ? "text-primary" : "text-foreground"
              }`}
              style={cast ? { background: "var(--clr-brand-dim)", boxShadow: "inset 0 0 0 1px var(--clr-brand)" } : undefined}
            >
              <span>{b.label}</span>
              {voters.length > 0 && b.key !== "discuss" && (
                <span className="text-[10px] text-muted-foreground">
                  {voters.length}{crewSize > 1 && b.key === "add_it" ? `/${Math.floor(crewSize / 2) + 1}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function PollCard({
  tripId, decision, currentUserId, crewSize,
}: {
  tripId: string;
  decision: HuddleDecision;
  currentUserId: string;
  crewSize: number;
}) {
  const [, startTransition] = useTransition();
  const [options, setOptions] = useState(decision.pollOptions ?? []);

  function vote(optionId: string) {
    setOptions((prev) =>
      prev.map((o) => ({
        ...o,
        voterIds:
          o.id === optionId
            ? [...o.voterIds.filter((v) => v !== currentUserId), currentUserId]
            : o.voterIds.filter((v) => v !== currentUserId),
      })),
    );
    startTransition(() => {
      votePoll(decision.id, tripId, optionId).catch(() => toast.error("That didn't save"));
    });
  }

  return (
    <article className="rounded-3xl bg-card border border-border p-4" style={{ boxShadow: "var(--shadow-md)" }}>
      <p className="text-[15px] font-bold">{decision.pollQuestion}</p>
      <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">
        Asked by {decision.createdByName.split(" ")[0]} · closes at majority ({Math.floor(crewSize / 2) + 1})
      </p>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const mine = o.voterIds.includes(currentUserId);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => vote(o.id)}
              className={`flex items-center justify-between rounded-2xl px-3 h-12 text-[14px] font-semibold border ${
                mine ? "border-primary text-primary" : "border-border text-foreground"
              }`}
              style={mine ? { background: "var(--accent-glow)" } : undefined}
            >
              <span>{o.label}</span>
              {o.voterIds.length > 0 && <span className="text-[12px] text-muted-foreground">{o.voterIds.length}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

/* ── Pulse activity card (§4-B) ─────────────────────────────────────────── */

function ActivityCard({ item, currency, tripId }: { item: PulseItem; currency: string; tripId: string }) {
  const t = useT();
  const first = item.actorName.split(" ")[0];
  const time = dfFormat(new Date(item.createdAt), "HH:mm");

  // Audit lines: quiet 13px, no thumb.
  if (item.eventType === "stop_removed") {
    return (
      <p className="px-4 py-2 text-[13px] text-muted-foreground">
        {t("huddle.removedStop", { name: first, place: item.placeName ?? t("huddle.aStop") })}
      </p>
    );
  }

  // Match card.
  if (item.eventType === "crew_match") {
    return (
      <div className="px-4 py-3">
        <p className="text-[14px]">
          🔥 <span className="font-bold">{t("huddle.crewMatch")}</span> {t("huddle.crewMatchWant")}{" "}
          <span className="font-bold">{item.placeName ?? t("huddle.samePlace")}</span>
        </p>
        <Link
          href={`/trips/${tripId}/itinerary`}
          className="inline-block mt-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-bold px-3 py-1.5"
        >
          {t("huddle.addToADay")}
        </Link>
      </div>
    );
  }

  // Dev-audit A5: full row deep-links to the entity it describes.
  const href = (() => {
    switch (item.eventType) {
      case "place_hearted": return `/trips/${tripId}/discover`;
      case "expense_logged":
      case "expense_settled": return `/trips/${tripId}/money`;
      case "stop_added":
      case "stop_done":
      case "stop_locked":
      case "suggestion_added": return `/trips/${tripId}/itinerary`;
      case "pack_item_claimed":
      case "pack_completed": return `/trips/${tripId}/pack`;
      default: return null;
    }
  })();

  const verb = (() => {
    const place = item.placeName ?? t("huddle.aPlace");
    const stop = item.placeName ?? t("huddle.aStop");
    switch (item.eventType) {
      case "place_hearted": return t("huddle.vHearted", { place });
      case "stop_added": return t("huddle.vAdded", { place: stop });
      case "stop_done": return t("huddle.vDone", { place: stop });
      case "stop_locked": return t("huddle.vLocked", { place: stop });
      case "suggestion_added": return t("huddle.vGoingIn", { place });
      case "suggestion_passed": return t("huddle.vMaybe", { place: item.placeName ?? t("huddle.aSuggestion") });
      case "expense_logged": return t("huddle.vExpense");
      case "expense_settled": return t("huddle.vSettled");
      case "pack_item_claimed": return t("huddle.vPack");
      case "poll_closed": return t("huddle.vPoll", { winner: (item.metadata.winner as string) ?? "", tally: (item.metadata.tally as string) ?? "" });
      default: return t("huddle.vMove");
    }
  })();

  const body = (
    <>
      {item.isSystem ? (
        <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-glow)" }}>
          ✦
        </span>
      ) : (
        <UserAvatar name={item.actorName} avatarUrl={item.actorAvatar} size="md" />
      )}
      <p className="flex-1 min-w-0 text-[14px] font-normal leading-snug">
        {!item.isSystem && <span className="font-bold">{first}</span>} {verb}
      </p>
      {item.placePhotoUrl && item.eventType !== "expense_logged" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.placePhotoUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
      )}
      {item.eventType === "expense_logged" && item.amount != null && (
        <span className="text-[14px] font-bold tabular-nums shrink-0">
          {item.currency ?? currency} {item.amount.toLocaleString()}
          {item.amountBase != null && item.currency !== currency && (
            <span className="block text-[11px] font-normal text-muted-foreground text-end">
              ≈ {currency} {item.amountBase.toLocaleString()}
            </span>
          )}
        </span>
      )}
      <span className="text-[11px] text-tertiary shrink-0">{time}</span>
    </>
  );
  return href ? (
    <Link href={href} className="flex items-center gap-3 px-4 py-2" style={{ minHeight: 64 }}>
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-4 py-2" style={{ minHeight: 64 }}>
      {body}
    </div>
  );
}

/* ── Poll composer ──────────────────────────────────────────────────────── */

function PollComposer({ tripId, open, onClose }: { tripId: string; open: boolean; onClose: () => void }) {
  const t = useT();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [pending, startTransition] = useTransition();

  // QA BUG-12: duplicate options can't be told apart on the ballot.
  const trimmed = options.map((o) => o.trim()).filter((o) => o.length >= 1);
  const hasDuplicates = new Set(trimmed.map((o) => o.toLowerCase())).size !== trimmed.length;

  function submit() {
    startTransition(() => {
      createPoll(tripId, question, options)
        .then(() => {
          toast.success(t("huddle.pollPosted"));
          // QA BUG-10: flushSync commits the close + reset BEFORE the
          // revalidatePath Suspense refresh repaints (B13a pattern).
          flushSync(() => {
            setQuestion("");
            setOptions(["", ""]);
            onClose();
          });
        })
        .catch((e) => toast.error(e?.message ?? t("huddle.pollFailed")));
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("huddle.askCrew")} size="sm">
      <div className="flex flex-col gap-3 pb-2">
        <div>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
            maxLength={200}
            placeholder={t("huddle.pollQuestionPh")}
            className="w-full h-12 rounded-2xl border border-border bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          {/* QA BUG-14: live counter — cap at 200 so a pasted wall of text
              can't spam the deck. */}
          <p className={`mt-1 text-end text-[11px] tabular-nums ${question.length >= 200 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
            {question.length}/200
          </p>
        </div>
        {options.map((o, i) => (
          <input
            key={i}
            value={o}
            onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={t("huddle.optionN", { n: i + 1 })}
            className="h-11 rounded-2xl border border-border bg-background px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        ))}
        {options.length < 4 && (
          <button type="button" onClick={() => setOptions((p) => [...p, ""])} className="text-start text-[13px] font-semibold text-primary px-1">
            {t("huddle.addOption")}
          </button>
        )}
        {hasDuplicates && (
          <p className="text-[12px] font-semibold text-destructive px-1">{t("huddle.optionsMustDiffer")}</p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !question.trim() || trimmed.length < 2 || hasDuplicates}
          className="h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] disabled:opacity-50"
        >
          {t("huddle.postToCrew")}
        </button>
      </div>
    </BottomSheet>
  );
}
