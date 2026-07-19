"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { differenceInCalendarDays } from "date-fns";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { ShareNetwork as Share2, Check, X } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { useT } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { setStopCompleted } from "@/lib/actions/itinerary";
import { markSettled } from "@/lib/actions/settlements";
import type { CockpitShared } from "./types";
import type { SettlementPair } from "@/lib/settle";

/**
 * Phase 6 §3-E / §7 — NOW in RECAP phase: "The Wrap". Memories, count-up
 * stats, crew awards, photo grid, settle-up, and a shareable story card.
 * ZERO editable planning UI — the retro-mark editor (empty state) is the
 * one sanctioned edit.
 */
export function RecapCockpit(
  props: CockpitShared & {
    spentByUser: Record<string, number>;
    heartsByUser?: Record<string, number>;
    settlePairs?: SettlementPair[];
    currentUserId: string;
  },
) {
  const t = useT();
  const {
    tripId, name, destination, startDate, endDate, heroImageUrl, currency,
    days, items, crew, spent, spentByUser, heartsByUser = {}, settlePairs = [],
    currentUserId,
  } = props;
  const base = `/trips/${tripId}`;

  const completedStops = items.filter((i) => i.completedAt != null);
  const totalDays = differenceInCalendarDays(parseDateOnly(endDate), parseDateOnly(startDate)) + 1;
  const kmWalked = useMemo(() => routeKm(completedStops), [completedStops]);
  const topCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of completedStops) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    let best: [string, number] | null = null;
    for (const e of counts) if (!best || e[1] > best[1]) best = e;
    return best;
  }, [completedStops]);

  const photos = items.filter((i) => (i as { photoUrl?: string | null }).photoUrl).slice(0, 12);

  // Crew awards (§3-E panel 3) — hide for solo trips.
  const awards: { label: string; member: string }[] = [];
  if (crew.length > 1) {
    const byId = new Map(crew.map((m) => [m.userId, m.displayName.split(" ")[0]]));
    const topHearts = Object.entries(heartsByUser).sort((a, b) => b[1] - a[1])[0];
    if (topHearts && topHearts[1] > 0) awards.push({ label: t("cockpit.awardHearts", { count: topHearts[1] }), member: byId.get(topHearts[0]) ?? "?" });
    const topSpender = Object.entries(spentByUser).sort((a, b) => b[1] - a[1])[0];
    if (topSpender && topSpender[1] > 0) awards.push({ label: t("cockpit.awardSpender"), member: byId.get(topSpender[0]) ?? "?" });
  }

  return (
    <main className="bg-background text-foreground min-h-svh">
      {/* PANEL 1 — HERO. No editing UI anywhere. */}
      <section className="relative w-full overflow-hidden flex flex-col justify-end" style={{ height: "62svh" }}>
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt={destination} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <RouteArt items={completedStops.length ? completedStops : items} className="absolute inset-0 w-full h-full" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 30%, rgba(0,0,0,0.9))" }} />
        <div className="relative px-5 pb-8">
          <h1 className="text-white" style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>
            {t("cockpit.wrappedTitle", { name: name.replace(/ trip$/i, "") })}
          </h1>
          <p className="text-white/70 text-[13px] mt-1">
            {dfFormat(parseDateOnly(startDate), "d MMM")} – {dfFormat(parseDateOnly(endDate), "d MMM")} · {t("cockpit.totalDays", { count: totalDays })}
          </p>
        </div>
      </section>

      <div
        className="flex flex-col gap-6 px-4 pt-6 max-w-2xl mx-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
      >
        {completedStops.length === 0 ? (
          /* EMPTY STATE — the retro-mark editor, RECAP's one sanctioned edit. */
          <section className="rounded-3xl bg-card border border-border p-4">
            <p className="text-[17px] font-bold">{t("cockpit.missedTrip")}</p>
            <p className="text-[14px] text-muted-foreground mt-1 mb-3">
              {t("cockpit.missedTripSub")}
            </p>
            <RetroMarkEditor tripId={tripId} items={items} />
          </section>
        ) : (
          <>
            {/* PANEL 2 — STATS with count-up. */}
            <section>
              <p className="text-[13px] text-muted-foreground mb-3">{t("cockpit.numbersStory")}</p>
              <div className="grid grid-cols-2 gap-3">
                <StatChip value={totalDays} label={t("cockpit.statDays")} />
                <StatChip value={completedStops.length} label={t("cockpit.statStops")} />
                {kmWalked > 0 && <StatChip value={Math.round(kmWalked)} label={t("cockpit.statKm")} />}
                <StatChip value={Math.round(spent)} label={t("cockpit.statSpent", { currency })} />
                <StatChip value={crew.length} label={crew.length === 1 ? t("cockpit.statTraveler") : t("cockpit.statCrew")} />
              </div>
              {topCategory && (
                <p className="text-[14px] text-muted-foreground mt-3">
                  {t("cockpit.mostVisited", { category: topCategory[0], count: topCategory[1] })}
                </p>
              )}
            </section>

            {/* PANEL 3 — CREW AWARDS. */}
            {awards.length > 0 && (
              <section className="flex gap-3 overflow-x-auto scrollbar-none">
                {awards.map((a) => (
                  <div key={a.label} className="shrink-0 rounded-2xl bg-card border border-border px-4 py-3 min-w-40">
                    <p className="text-[13px] text-muted-foreground">{a.label}</p>
                    <p className="text-[17px] font-bold mt-0.5">{a.member}</p>
                  </div>
                ))}
              </section>
            )}

            {/* PANEL 4 — PHOTO GRID. */}
            {photos.length > 0 && (
              <section>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                  {photos.map((p) => (
                    <Link key={p.id} href={`${base}/recap/photos`} className="relative aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={(p as { photoUrl?: string | null }).photoUrl ?? ""}
                        alt={p.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
                <Link href={`${base}/recap/photos`} className="block text-[13px] font-semibold text-primary mt-2">
                  {t("cockpit.allPhotos")}
                </Link>
              </section>
            )}
          </>
        )}

        {/* PANEL 5 — SETTLE. */}
        <SettlePanel
          tripId={tripId}
          pairs={settlePairs}
          crew={crew}
          currency={currency}
          currentUserId={currentUserId}
        />

        {/* PANEL 6 — SHARE. */}
        <SharePanel
          tripName={name}
          stats={{ days: totalDays, stops: completedStops.length, spent: Math.round(spent), currency, crew: crew.length }}
          items={completedStops.length ? completedStops : items}
        />
      </div>
    </main>
  );
}

/* ── Count-up stat chip ─────────────────────────────────────────────────── */

function StatChip({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 800);
          setShown(Math.round(value * (1 - Math.pow(1 - p, 3)))); // ease-out
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="rounded-2xl bg-card border border-border px-4 py-3">
      <p className="text-[26px] font-extrabold tabular-nums text-foreground">{shown.toLocaleString()}</p>
      <p className="text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Retro-mark editor ──────────────────────────────────────────────────── */

function RetroMarkEditor({ tripId, items }: { tripId: string; items: CockpitShared["items"] }) {
  const t = useT();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState<Set<string>>(new Set());

  return (
    <div className="divide-y divide-border/60 rounded-2xl bg-muted overflow-hidden">
      {items.slice(0, 20).map((i) => {
        const marked = done.has(i.id);
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => {
              setDone((prev) => {
                const next = new Set(prev);
                if (marked) next.delete(i.id);
                else next.add(i.id);
                return next;
              });
              startTransition(() => {
                setStopCompleted(i.id, tripId, !marked).catch(() => toast.error(t("cockpit.couldntSave")));
              });
            }}
            className="w-full flex items-center gap-3 h-12 px-4 text-start"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                marked ? "bg-success" : "border-[1.5px] border-border"
              }`}
            >
              {marked && <Check size={14} className="text-white" strokeWidth={2.5} />}
            </span>
            <span className="flex-1 min-w-0 text-[14px] font-medium truncate">{i.title}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Settle panel ───────────────────────────────────────────────────────── */

function SettlePanel({
  tripId, pairs, crew, currency, currentUserId,
}: {
  tripId: string;
  pairs: SettlementPair[];
  crew: CockpitShared["crew"];
  currency: string;
  currentUserId: string;
}) {
  const t = useT();
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const nameOf = (id: string) => crew.find((m) => m.userId === id)?.displayName.split(" ")[0] ?? "Someone";
  const open = pairs.filter((p) => !settled.has(`${p.fromUserId}:${p.toUserId}`));

  return (
    <section className="rounded-3xl bg-card border border-border p-4">
      <p className="text-[15px] font-bold mb-2">{t("cockpit.oneLastThing")}</p>
      {open.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">{t("expenses.allSquare")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {open.map((p) => {
            const key = `${p.fromUserId}:${p.toUserId}`;
            const amountStr = `${currency} ${p.amount.toLocaleString()}`;
            const line =
              p.toUserId === currentUserId
                ? t("expenses.owesYouLine", { name: nameOf(p.fromUserId), amount: amountStr })
                : p.fromUserId === currentUserId
                  ? t("expenses.youOweLine", { name: nameOf(p.toUserId), amount: amountStr })
                  : t("expenses.owesLine", { from: nameOf(p.fromUserId), to: nameOf(p.toUserId), amount: amountStr });
            return (
              <div key={key} className="flex items-center gap-3 h-14">
                <UserAvatar name={nameOf(p.fromUserId)} avatarUrl={crew.find((m) => m.userId === p.fromUserId)?.avatarUrl ?? null} seed={p.fromUserId} size="sm" />
                <span className="flex-1 min-w-0 text-[15px] font-medium truncate">{line}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSettled((prev) => new Set(prev).add(key));
                    startTransition(() => {
                      markSettled({ tripId, creditorId: p.toUserId, debtorId: p.fromUserId, amount: p.amount, currency })
                        .then(() => toast.success(t("cockpit.settledToastAmt", { amount: amountStr })))
                        .catch(() => {
                          setSettled((prev) => {
                            const next = new Set(prev);
                            next.delete(key);
                            return next;
                          });
                          toast.error(t("cockpit.settleFailed"));
                        });
                    });
                  }}
                  className="shrink-0 h-9 px-3 rounded-full border border-border text-[13px] font-bold text-foreground"
                >
                  {t("cockpit.markSettled")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Share panel + canvas card (§7-B) ───────────────────────────────────── */

function SharePanel({
  tripName, stats, items,
}: {
  tripName: string;
  stats: { days: number; stops: number; spent: number; currency: string; crew: number };
  items: CockpitShared["items"];
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const blob = await generateWrapCard(tripName, stats, items);
      const file = new File([blob], "paxawa-wrap.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: t("cockpit.wrapShareTitle", { name: tripName }),
          text: t("cockpit.shareText"),
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "paxawa-wrap.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t("cockpit.wrapDownloaded"));
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error(t("cockpit.shareCardFailed"));
    } finally {
      setBusy(false);
    }
  }

  // §3-A RECAP [+] default fires this too.
  useEffect(() => {
    const handler = () => void share();
    window.addEventListener("paxawa:shareWrap", handler);
    return () => window.removeEventListener("paxawa:shareWrap", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] py-3.5 disabled:opacity-60"
      >
        <Share2 size={18} /> {t("cockpit.shareWrap")}
      </button>
      <Link
        href="/dashboard"
        className="w-full flex items-center justify-center rounded-2xl border border-border text-foreground font-bold text-[15px] py-3.5"
      >
        {t("cockpit.startNext")}
      </Link>
    </section>
  );
}

async function generateWrapCard(
  tripName: string,
  stats: { days: number; stops: number; spent: number; currency: string; crew: number },
  items: CockpitShared["items"],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, 1080, 1920);

  // Route line generative art.
  const coords = items.filter((i) => i.lat != null && i.lng != null) as { lat: number; lng: number }[];
  if (coords.length > 1) {
    const lats = coords.map((c) => c.lat);
    const lngs = coords.map((c) => c.lng);
    const pad = 160;
    const w = 1080 - pad * 2;
    const h = 900;
    const sx = (lng: number) => pad + ((lng - Math.min(...lngs)) / Math.max(1e-6, Math.max(...lngs) - Math.min(...lngs))) * w;
    const sy = (lat: number) => 350 + h - ((lat - Math.min(...lats)) / Math.max(1e-6, Math.max(...lats) - Math.min(...lats))) * h;
    ctx.strokeStyle = "#3EC5B7";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    coords.forEach((c, i) => (i === 0 ? ctx.moveTo(sx(c.lng), sy(c.lat)) : ctx.lineTo(sx(c.lng), sy(c.lat))));
    ctx.stroke();
    ctx.fillStyle = "#3EC5B7";
    for (const c of coords) {
      ctx.beginPath();
      ctx.arc(sx(c.lng), sy(c.lat), 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 80px system-ui, -apple-system, sans-serif";
  ctx.fillText(`${tripName},`, 80, 1420);
  ctx.fillText("wrapped.", 80, 1515);

  ctx.fillStyle = "#8B7CFF";
  ctx.font = "700 48px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    `${stats.days} days · ${stats.stops} stops · ${stats.currency} ${stats.spent.toLocaleString()}`,
    80,
    1620,
  );

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 36px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("paxawa.com", 540, 1830);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** Haversine km along the completed route (§7-A kmWalked). */
function routeKm(stops: CockpitShared["items"]): number {
  const coords = stops.filter((s) => s.lat != null && s.lng != null) as { lat: number; lng: number }[];
  let km = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    km += 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  return km;
}

/* ── Route-line SVG art (hero fallback) ─────────────────────────────────── */

function RouteArt({ items, className }: { items: CockpitShared["items"]; className?: string }) {
  const coords = items.filter((i) => i.lat != null && i.lng != null) as { lat: number; lng: number }[];
  if (coords.length < 2) {
    return <div className={`${className ?? ""} bg-gradient-to-br from-primary/30 to-primary/50`} />;
  }
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  const nx = (lng: number) => 10 + ((lng - Math.min(...lngs)) / Math.max(1e-6, Math.max(...lngs) - Math.min(...lngs))) * 80;
  const ny = (lat: number) => 90 - ((lat - Math.min(...lats)) / Math.max(1e-6, Math.max(...lats) - Math.min(...lats))) * 80;
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${nx(c.lng).toFixed(1)},${ny(c.lat).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className={`${className ?? ""} bg-background`}>
      <path d={d} fill="none" stroke="#3EC5B7" strokeWidth={1.2} strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={nx(c.lng)} cy={ny(c.lat)} r={1.8} fill="#3EC5B7" />
      ))}
    </svg>
  );
}

void X;
