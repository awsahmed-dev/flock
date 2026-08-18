"use client";

import { protectedFileUrl } from "@/lib/storage-url";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Camera, Plus, Image as ImageIcon, CircleNotch as Loader2, Package } from "@phosphor-icons/react/dist/ssr";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { diffDaysIso, toIsoDay } from "@/lib/today";
import { setStopCompleted, updateItemStatus } from "@/lib/actions/itinerary";
import { togglePackingItem } from "@/lib/actions/packing";
import { addTripPhoto } from "@/lib/actions/photos";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

type Item = InferSelectModel<typeof itineraryItems>;
type T = (key: string, params?: Record<string, string | number>) => string;

/* ─── Sprint 8 Item 6: LIVE — the day as a timeline ─────────────────────
   Spine + per-stop dots, a NOW line where the crew currently is (today
   only), Done / Doing now / Up next states, one-tap mark-done ring and a
   camera shortcut for logging a photo-expense at the stop. */
export function LiveDayTimeline({
  tripId,
  items,
  isToday,
  t,
  onLocalDone,
}: {
  tripId: string;
  items: Item[];
  isToday: boolean;
  t: T;
  onLocalDone: (itemId: string, done: boolean) => void;
}) {
  const [, startTransition] = useTransition();
  const firstOpenIdx = items.findIndex((i) => i.completedAt == null);
  const nowHm = new Date().toTimeString().slice(0, 5);

  function toggleDone(item: Item) {
    const next = item.completedAt == null;
    onLocalDone(item.id, next);
    startTransition(async () => {
      try {
        await setStopCompleted(item.id, tripId, next);
      } catch {
        onLocalDone(item.id, !next);
        toast.error(t("itinerary.updateFailed"));
      }
    });
  }

  const nowLine = (
    <div className="relative h-6 my-1" aria-label={`${t("itinerary.nowLabel")} ${nowHm}`}>
      <div className="absolute inset-x-0 top-1/2 border-t-2" style={{ borderColor: "var(--clr-horizon)" }} />
      <span
        className="absolute end-0 top-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-primary-foreground tabular-nums"
        style={{ background: "var(--clr-horizon)" }}
      >
        {t("itinerary.nowLabel")} {nowHm}
      </span>
    </div>
  );

  return (
    <div className="relative ps-5">
      {/* Spine. */}
      <div className="absolute inset-y-2 start-1 w-0.5 bg-border" aria-hidden />
      {items.map((item, idx) => {
        const done = item.completedAt != null;
        const isNow = isToday && idx === firstOpenIdx;
        const stateLabel = done
          ? t("now.done")
          : isNow
            ? t("itinerary.doingNow")
            : t("now.upNext");
        return (
          <div key={item.id}>
            {isNow && nowLine}
            <div
              className="relative flex items-center gap-2.5 rounded-2xl bg-card border px-3 py-2.5 mb-2"
              style={isNow ? { borderColor: "var(--clr-wayfind)" } : { borderColor: "var(--border)" }}
            >
              {/* Timeline dot. */}
              <span
                aria-hidden
                className="absolute -start-[18px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                style={{
                  background: done ? "var(--clr-moss)" : isNow ? "var(--clr-wayfind)" : "var(--muted-foreground)",
                }}
              />
              {/* Mark-done ring. */}
              <button
                type="button"
                onClick={() => toggleDone(item)}
                aria-label={done ? t("itinerary.markNotDone") : t("now.done")}
                className="tap-hit shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2"
                style={
                  done
                    ? { background: "var(--clr-moss)", borderColor: "var(--clr-moss)", color: "var(--primary-foreground)" }
                    : { borderColor: "var(--border)" }
                }
              >
                {done && <Check size={14} weight="bold" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-bold truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                  {item.title}
                </p>
                {(item.startTime || item.locationName) && (
                  <p className="text-[12px] text-muted-foreground truncate">
                    {[item.startTime?.slice(0, 5), item.locationName].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <span
                className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full"
                style={
                  done
                    ? { background: "var(--clr-moss-dim)", color: "var(--clr-moss)" }
                    : isNow
                      ? { background: "var(--clr-wayfind-dim)", color: "var(--clr-wayfind)" }
                      : { background: "var(--muted)", color: "var(--muted-foreground)" }
                }
              >
                {stateLabel}
              </span>
              <Link
                href={`/trips/${tripId}/money?add=expense`}
                aria-label={t("now.logExpense")}
                className="shrink-0 text-muted-foreground"
              >
                <Camera size={18} />
              </Link>
            </div>
          </div>
        );
      })}
      {/* Whole day done → NOW sits at the end. */}
      {isToday && items.length > 0 && firstOpenIdx === -1 && nowLine}
    </div>
  );
}

/* ─── Sprint 8 Item 6: DEPARTURE — countdown + pack-today ───────────────
   Renders once above the day list: how long to departure, and the
   unpacked items that still need attention (day-pinned documents already
   render under each day). */
export function DepartureStrip({
  tripId,
  startDate,
  packItems,
  t,
  todayIso,
}: {
  tripId: string;
  startDate: string;
  packItems: { id: string; label: string; category: string; packed: boolean }[];
  t: T;
  /** fix/tz: today in the traveller's zone, from the server. */
  todayIso: string;
}) {
  const [, startTransition] = useTransition();
  // Optimistic overrides — the server round-trip shouldn't gate the tick.
  const [localPacked, setLocalPacked] = useState<Record<string, boolean>>({});
  const packed = (p: { id: string; packed: boolean }) => localPacked[p.id] ?? p.packed;
  const left = packItems.filter((p) => !packed(p)).length;
  // fix/tz: a calendar-day countdown. Computed from `new Date()` this ticked
  // down visibly on hydration every night for any traveller east of UTC.
  const daysOut = Math.max(0, diffDaysIso(todayIso, toIsoDay(startDate)));
  const show = [...packItems].sort((a, b) => Number(packed(a)) - Number(packed(b))).slice(0, 6);

  function toggle(id: string) {
    const item = packItems.find((p) => p.id === id);
    if (!item) return;
    setLocalPacked((prev) => ({ ...prev, [id]: !packed(item) }));
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("itemId", id);
    startTransition(async () => {
      try {
        await togglePackingItem(fd);
      } catch {
        setLocalPacked((prev) => ({ ...prev, [id]: packed(item) }));
        toast.error(t("itinerary.updateFailed"));
      }
    });
  }

  return (
    <div className="mb-4">
      {/* Countdown card. */}
      <div
        className="flex items-baseline justify-between rounded-2xl border px-4 py-3"
        style={{ background: "var(--clr-horizon-dim)", borderColor: "var(--clr-horizon)" }}
      >
        <p className="text-[15px]">
          <span className="font-extrabold text-[17px]" style={{ color: "var(--clr-horizon)" }}>
            {daysOut === 1 ? t("itinerary.oneDay") : t("itinerary.daysCount", { count: daysOut })}
          </span>{" "}
          <span className="text-muted-foreground text-[12px]">
            · {format(parseDateOnly(startDate), "EEE d MMM")}
          </span>
        </p>
        <p className="text-[12px] text-muted-foreground">{t("itinerary.toDeparture")}</p>
      </div>

      {/* Pack today. */}
      {packItems.length > 0 && (
        <div className="mt-3">
          <p className="text-[12px] font-bold uppercase text-tertiary mb-2" style={{ letterSpacing: 1.2 }}>
            {t("itinerary.packToday")}
            {left > 0 ? ` · ${t("itinerary.leftCount", { count: left })}` : ` · ${t("itinerary.allPacked")}`}
          </p>
          <ul className="space-y-1.5">
            {show.map((p) => {
              const isPacked = packed(p);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="w-full flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2 text-start"
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center"
                      style={
                        isPacked
                          ? { background: "var(--clr-moss)", borderColor: "var(--clr-moss)", color: "var(--primary-foreground)" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {isPacked && <Check size={12} weight="bold" />}
                    </span>
                    <span className={`flex-1 text-[14px] font-semibold ${isPacked ? "line-through text-muted-foreground" : ""}`}>
                      {p.label}
                    </span>
                    <span className="text-[11px] text-tertiary capitalize">{p.category}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/trips/${tripId}/pack`}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary"
          >
            <Package size={14} /> {t("itinerary.openPackList")}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── Sprint 8 Item 6: RECAP — "did you go?" check-in per stop ──────────
   Yes → completed; No → skipped (status: rejected); Something else →
   edit the stop into what actually happened. Plus a crew-photo drop that
   feeds the Wrap (trip_photos). */
export function RecapStopCard({
  tripId,
  item,
  photoCount,
  t,
  onEdit,
  onLocalChange,
}: {
  tripId: string;
  item: Item;
  photoCount: number;
  t: T;
  onEdit: () => void;
  onLocalChange: (itemId: string, patch: Partial<Item>) => void;
}) {
  const [, startTransition] = useTransition();
  const [reopened, setReopened] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPhotos, setLocalPhotos] = useState(0);
  // addTripPhoto revalidates the route, so the server count eventually
  // includes our optimistic upload — reset the local increment when it
  // arrives or the badge double-counts ("adjust state on prop change").
  const [seenServerCount, setSeenServerCount] = useState(photoCount);
  if (photoCount !== seenServerCount) {
    setSeenServerCount(photoCount);
    setLocalPhotos(0);
  }
  const fileRef = useRef<HTMLInputElement>(null);

  const answer: "went" | "skipped" | null =
    item.completedAt != null ? "went" : item.status === "rejected" ? "skipped" : null;
  const showButtons = answer == null || reopened;

  function answerYes() {
    setReopened(false);
    onLocalChange(item.id, { completedAt: new Date(), status: "confirmed" } as Partial<Item>);
    startTransition(async () => {
      try {
        await setStopCompleted(item.id, tripId, true);
        if (item.status === "rejected") await updateItemStatus(item.id, tripId, "confirmed");
      } catch {
        toast.error(t("itinerary.updateFailed"));
      }
    });
  }

  function answerNo() {
    setReopened(false);
    onLocalChange(item.id, { completedAt: null, status: "rejected" } as Partial<Item>);
    startTransition(async () => {
      try {
        if (item.completedAt != null) await setStopCompleted(item.id, tripId, false);
        await updateItemStatus(item.id, tripId, "rejected");
      } catch {
        toast.error(t("itinerary.updateFailed"));
      }
    });
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      // Same convention as documents: first folder must be auth.uid()
      // for the storage INSERT policy to pass.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      const path = `${user.id}/${tripId}/wrap-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("trip-documents")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      const res = await addTripPhoto({ tripId, itemId: item.id, url: protectedFileUrl("trip-documents", path) });
      if (res.error) throw new Error(res.error);
      setLocalPhotos((n) => n + 1);
      toast.success(t("itinerary.photoAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("itinerary.updateFailed"));
    } finally {
      setUploading(false);
    }
  }

  const totalPhotos = photoCount + localPhotos;
  const segBase = "flex-1 h-9 rounded-full text-[12px] font-bold border transition-colors";

  return (
    <div className="rounded-2xl bg-card border border-border px-3 py-3">
      <p className="text-[14px] font-bold mb-2">
        {item.title} <span className="text-muted-foreground font-semibold">— {t("itinerary.didYouGo")}</span>
      </p>

      {showButtons ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={answerYes}
            className={segBase}
            style={{ background: "var(--clr-moss-dim)", borderColor: "var(--clr-moss)", color: "var(--clr-moss)" }}
          >
            {t("itinerary.yes")}
          </button>
          <button type="button" onClick={answerNo} className={`${segBase} bg-muted border-border text-muted-foreground`}>
            {t("itinerary.no")}
          </button>
          <button type="button" onClick={onEdit} className={`${segBase} bg-muted border-border text-muted-foreground`}>
            {t("itinerary.somethingElse")}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span
            className="text-[12px] font-bold px-2.5 py-1 rounded-full"
            style={
              answer === "went"
                ? { background: "var(--clr-moss-dim)", color: "var(--clr-moss)" }
                : { background: "var(--muted)", color: "var(--muted-foreground)" }
            }
          >
            {answer === "went" ? `${t("itinerary.went")} ✓` : t("itinerary.skipped")}
          </span>
          <button type="button" onClick={() => setReopened(true)} className="text-[12px] font-bold text-primary">
            {t("itinerary.change")}
          </button>
        </div>
      )}

      {/* Crew-photo drop for the Wrap — only for stops that happened. */}
      {answer !== "skipped" && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-3 py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          {t("itinerary.dropPhotos")}
          {totalPhotos > 0 && (
            <span className="font-bold text-foreground tabular-nums">· {totalPhotos}</span>
          )}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
    </div>
  );
}

/* Shared dashed add-row (PLANNING/DEPARTURE inline add, RECAP "add what
   you actually did"). */
export function InlineAddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border/70 hover:border-primary/40 hover:bg-accent/20 px-3.5 py-3 text-[13px] text-muted-foreground hover:text-foreground transition-colors text-start"
    >
      <Plus size={16} className="text-primary shrink-0" />
      {label}
    </button>
  );
}
