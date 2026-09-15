"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkle as Sparkles,
  ArrowsClockwise,
  X,
  PushPin,
  Plus,
  Minus,
  CheckCircle,
  Users,
  CaretDown,
  CaretRight,
  Star,
  CircleNotch as Loader2,
} from "@phosphor-icons/react/dist/ssr";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import type { PackagePayload, PackageRecord } from "@/lib/actions/packages";
import {
  adoptPackage,
  generatePackage,
  savePackagePayload,
  sharePackage,
  reactToDay,
} from "@/lib/actions/packages";

const CATEGORY_EMOJI: Record<string, string> = {
  sight: "📍", food: "🍽️", walk: "🚶", shop: "🛍️", nature: "🌿", rest: "♨️",
};

/**
 * The باقة screen — show-then-shape.
 *
 * The old flow asked ~21 questions across four steps and only then showed
 * anything. This shows the plan first and lets the user *react*: swap,
 * remove, pin, lighten, add from saves. Reacting is both easier than a form
 * and a more honest signal, because it is judgement on something concrete.
 *
 * Solo is not a mode: the crew strip and the share button simply aren't
 * rendered while the trip has one member, and they appear the moment
 * somebody joins.
 */
export function PackageView({
  tripId,
  initial,
  memberCount,
  canManage,
}: {
  tripId: string;
  initial: PackageRecord | null;
  memberCount: number;
  canManage: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [pkg, setPkg] = useState<PackageRecord | null>(initial);
  const [busy, startTransition] = useTransition();
  const [working, setWorking] = useState(false);
  const [openDay, setOpenDay] = useState(0);
  const isGroup = memberCount > 1;

  const totals = useMemo(() => {
    if (!pkg) return { stops: 0, days: 0, fromSaves: 0 };
    const days = pkg.payload.days.length;
    const stops = pkg.payload.days.reduce((n, d) => n + d.places.length, 0);
    const fromSaves = pkg.payload.days.reduce(
      (n, d) => n + d.places.filter((p) => p.fromSaveId).length, 0);
    return { stops, days, fromSaves };
  }, [pkg]);

  async function mutate(next: PackagePayload) {
    // Optimistic, but reversible: without the rollback a failed save left the
    // screen showing a stop the database still had (or hiding one it didn't),
    // and the next refresh silently undid what the user thought they'd done.
    const prev = pkg?.payload;
    setPkg((p) => (p ? { ...p, payload: next } : p));
    try {
      await savePackagePayload(tripId, next);
    } catch {
      if (prev) setPkg((p) => (p ? { ...p, payload: prev } : p));
      toast.error(t("pkg.saveFailed"));
    }
  }

  function removePlace(dayIdx: number, key: string) {
    if (!pkg) return;
    const next = structuredClone(pkg.payload);
    next.days[dayIdx].places = next.days[dayIdx].places.filter((p) => p.key !== key);
    mutate(next);
  }

  function pinPlace(dayIdx: number, key: string) {
    if (!pkg) return;
    const next = structuredClone(pkg.payload);
    const p = next.days[dayIdx].places.find((x) => x.key === key);
    if (p) p.pinned = !p.pinned;
    mutate(next);
  }

  /** «خفّف» — drop the lowest-signal unpinned stop of the day. */
  function lighten(dayIdx: number) {
    if (!pkg) return;
    const next = structuredClone(pkg.payload);
    const places = next.days[dayIdx].places;
    let weakest = -1, low = Infinity;
    places.forEach((p, i) => {
      if (p.pinned) return;
      const r = p.rating ?? 0;
      if (r < low) { low = r; weakest = i; }
    });
    if (weakest < 0) { toast.info(t("pkg.allPinned")); return; }
    places.splice(weakest, 1);
    mutate(next);
  }

  /** «كثّف» — pull an unplaced save into this day. */
  function densify(dayIdx: number) {
    if (!pkg) return;
    const next = structuredClone(pkg.payload);
    const pick = next.unplaced.shift();
    if (!pick) { toast.info(t("pkg.noMoreSaves")); return; }
    next.days[dayIdx].places.push({
      key: `s-${pick.saveId}`,
      name: pick.name,
      why: t("pkg.fromSaves"),
      category: "sight",
      fromSaveId: pick.saveId,
      fromLabel: t("pkg.fromSaves"),
      pinned: true,
    });
    mutate(next);
  }

  async function regenerate() {
    setWorking(true);
    try {
      const fresh = await generatePackage(tripId, locale === "ar" ? "ar" : "en");
      setPkg(fresh);
      toast.success(t("pkg.rebuilt"));
    } catch {
      toast.error(t("pkg.saveFailed"));
    } finally {
      setWorking(false);
    }
  }

  function adopt() {
    startTransition(async () => {
      try {
        const { added, already } = await adoptPackage(tripId);
        toast.success(already ? t("pkg.alreadyAdopted") : t("pkg.adopted", { count: added }));
        router.push(`/trips/${tripId}/itinerary`);
        router.refresh();
      } catch {
        toast.error(t("pkg.saveFailed"));
      }
    });
  }

  /* ── empty: offer to build it ─────────────────────────────────────── */
  if (!pkg) {
    return (
      <div className="px-4 py-10 text-center">
        <Sparkles size={40} weight="fill" className="mx-auto text-primary" />
        <h1 className="mt-4 text-[22px] font-extrabold">{t("pkg.emptyTitle")}</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">{t("pkg.emptyBody")}</p>
        <button
          type="button"
          disabled={working}
          onClick={regenerate}
          className="mt-6 w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-[16px] inline-flex items-center justify-center gap-2"
        >
          {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles size={20} weight="fill" />}
          {t("pkg.build")}
        </button>
      </div>
    );
  }

  const adopted = pkg.status === "adopted";
  // The day titles and "why" lines are written into the payload at build
  // time, so a plan built in Arabic keeps speaking Arabic under an English
  // UI — the cover read "The classic route / المسار الكلاسيكي" at once.
  // Rebuilding is instant and local, but it discards manual edits, so it is
  // offered rather than done silently.
  const wrongLocale = !!pkg.payload.locale && pkg.payload.locale !== locale;

  return (
    <div className="pb-56">
      {/* ── cover ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="rounded-3xl bg-gradient-to-br from-[var(--purple-600)] to-[var(--purple-400)] text-white p-5 relative overflow-hidden">
          <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wide">
              {pkg.tier === "canonical" ? t("pkg.tierCanonical") : t("pkg.tierAssembled")}
            </span>
            <h1 className="mt-2.5 text-[24px] font-extrabold leading-tight">{pkg.title}</h1>
            {pkg.subtitle && <p className="mt-1 text-[14px] text-white/85">{pkg.subtitle}</p>}
            <p className="mt-3 text-[13px] text-white/80 leading-relaxed">{pkg.payload.provenance}</p>
            <div className="mt-4 flex items-center gap-4 text-[12px] font-semibold">
              <span>{t("pkg.statDays", { count: totals.days })}</span>
              <span className="opacity-60">·</span>
              <span>{t("pkg.statStops", { count: totals.stops })}</span>
              {totals.fromSaves > 0 && (
                <>
                  <span className="opacity-60">·</span>
                  <span className="text-[color:var(--clr-dune,#E0B252)]">
                    {t("pkg.statFromSaves", { count: totals.fromSaves })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {wrongLocale && canManage && !adopted && (
        <button
          type="button"
          onClick={regenerate}
          disabled={working}
          className="mx-4 mt-3 w-[calc(100%-2rem)] min-h-12 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-start inline-flex items-center gap-2.5"
        >
          <ArrowsClockwise size={16} className="text-primary shrink-0" />
          <span className="text-[12.5px] font-semibold">{t("pkg.rebuildLocale")}</span>
        </button>
      )}

      {/* ── unplaced saves tray ───────────────────────────────────── */}
      {pkg.payload.unplaced.length > 0 && (
        <div className="mx-4 mt-3 rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[13px] font-bold">
            {t("pkg.trayTitle", { count: pkg.payload.unplaced.length })}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{t("pkg.trayBody")}</p>
        </div>
      )}

      {/* ── days ──────────────────────────────────────────────────── */}
      <div className="px-4 mt-4 space-y-2.5">
        {pkg.payload.days.map((day, i) => {
          const open = openDay === i;
          const dayReactions = pkg.reactions.filter((r) => r.dayIndex === i && !r.vetoPlaceId);
          return (
            <div key={day.index} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenDay(open ? -1 : i)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-start"
              >
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-extrabold text-[14px] inline-flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[15px] truncate">{day.title}</span>
                  <span className="block text-[12px] text-muted-foreground truncate">
                    {day.city} · {t("pkg.statStops", { count: day.places.length })}
                  </span>
                </span>
                {isGroup && dayReactions.length > 0 && (
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {dayReactions.filter((r) => r.reaction === "love").length > 0 && "🔥"}
                    {dayReactions.filter((r) => r.reaction === "skip").length > 0 && "⚠️"}
                  </span>
                )}
                {open ? <CaretDown size={16} className="shrink-0 text-muted-foreground" />
                      : <CaretRight size={16} className="shrink-0 text-muted-foreground rtl:rotate-180" />}
              </button>

              {open && (
                <div className="px-3 pb-3 space-y-2">
                  {day.places.map((p) => (
                    <div key={p.key} className="rounded-xl bg-muted/40 p-3 flex items-start gap-2.5">
                      <span className="text-[20px] shrink-0 leading-none mt-0.5">
                        {CATEGORY_EMOJI[p.category] ?? "📍"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[14px]">{p.name}</span>
                          {p.startTime && (
                            <span className="text-[11px] text-muted-foreground tabular-nums" dir="ltr">
                              {p.startTime}
                            </span>
                          )}
                          {p.rating != null && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <Star size={11} weight="fill" className="text-[color:var(--clr-dune,#E0B252)]" />
                              <span dir="ltr">{p.rating}</span>
                            </span>
                          )}
                          {p.fromLabel && (
                            <span className="text-[10px] font-bold rounded-full bg-primary/12 text-primary px-2 py-0.5">
                              {p.fromLabel}
                            </span>
                          )}
                        </div>
                        {p.why && (
                          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{p.why}</p>
                        )}
                        {/* 28px stacked squares were below every touch
                            minimum and sat 4px apart, so "pin" regularly
                            removed the stop instead. Full-size targets, on
                            their own row. */}
                        {canManage && !adopted && (
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              aria-label={t("pkg.pin")}
                              aria-pressed={!!p.pinned}
                              onClick={() => pinPlace(i, p.key)}
                              className={`w-12 h-12 rounded-xl inline-flex items-center justify-center ${p.pinned ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                            >
                              <PushPin size={18} weight={p.pinned ? "fill" : "regular"} />
                            </button>
                            <button
                              type="button"
                              aria-label={t("pkg.remove")}
                              onClick={() => removePlace(i, p.key)}
                              className="w-12 h-12 rounded-xl text-muted-foreground hover:bg-muted inline-flex items-center justify-center"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {day.places.length === 0 && (
                    <p className="text-[12.5px] text-muted-foreground px-1 py-2">{t("pkg.dayEmpty")}</p>
                  )}

                  {canManage && !adopted && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => lighten(i)}
                        className="flex-1 h-12 rounded-xl border border-border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <Minus size={16} /> {t("pkg.lighten")}
                      </button>
                      <button
                        type="button"
                        onClick={() => densify(i)}
                        className="flex-1 h-12 rounded-xl border border-border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <Plus size={16} /> {t("pkg.densify")}
                      </button>
                    </div>
                  )}

                  {/* crew reaction — only exists once there IS a crew */}
                  {isGroup && (
                    <div className="flex items-center gap-2 pt-1.5 border-t border-border/60 mt-1">
                      {(["love", "ok", "skip"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => startTransition(async () => { await reactToDay(tripId, i, r); router.refresh(); })}
                          className="flex-1 h-12 rounded-xl border border-border text-[13px] font-semibold"
                        >
                          {r === "love" ? "🔥" : r === "ok" ? "🙂" : "⤫"} {t(`pkg.react_${r}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── sticky actions ────────────────────────────────────────── */}
      {canManage && (
        <div
          /* Sits ABOVE the app's bottom nav — fixed bottom-0 put the adopt
             button behind it (local QA 2026-09-16). */
          className="fixed inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur px-4 pt-3 pb-3"
          style={{ bottom: "calc(env(safe-area-inset-bottom,0) + 76px)" }}
        >
          {adopted ? (
            /* Adoption used to be a dead end: the bar said "this is your
               itinerary" and offered nothing, so there was no way back to
               planning short of deleting stops by hand. */
            <>
              <p className="text-center text-[13px] font-semibold text-muted-foreground">
                {t("pkg.alreadyAdopted")}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!confirm(t("pkg.rebuildAdoptedConfirm"))) return;
                  void regenerate();
                }}
                disabled={working}
                className="mt-2 w-full h-12 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center gap-1.5"
              >
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowsClockwise size={16} />}
                {t("pkg.replan")}
              </button>
            </>
          ) : (
            <>
              {/* A destination with no curated route and no saves builds an
                  honest empty skeleton — adopting it would write nothing and
                  return a bare error, so the button says what's missing. */}
              <button
                type="button"
                onClick={adopt}
                disabled={busy || totals.stops === 0}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-[16px] inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle size={20} weight="fill" />}
                {totals.stops === 0 ? t("pkg.adoptEmpty") : t("pkg.adopt")}
              </button>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={working}
                  className="flex-1 h-12 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center gap-1.5"
                >
                  {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowsClockwise size={16} />}
                  {t("pkg.rebuild")}
                </button>
                {isGroup && (
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await sharePackage(tripId); toast.success(t("pkg.shared")); router.refresh(); })}
                    className="flex-1 h-12 rounded-2xl border border-border font-semibold text-[13.5px] inline-flex items-center justify-center gap-1.5"
                  >
                    <Users size={16} /> {t("pkg.share")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
