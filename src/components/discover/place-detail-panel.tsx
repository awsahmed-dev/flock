"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  X, Star, MapPin, Clock, Plus, Check, ChevronLeft, ChevronRight, ExternalLink,
  Loader2, Heart, Sparkles, Tag, Users,
} from "lucide-react";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { toast } from "sonner";
import type { Place } from "@/lib/places/types";
import type { ScoredPlace } from "@/lib/discovery/score";
import { createItineraryItemFromGooglePlace, deleteItineraryItem } from "@/lib/actions/itinerary";
import { createDecision } from "@/lib/actions/decisions";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/locale-provider";
import { PoweredByGoogle } from "./primitives";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/primitives/buttons/ripple";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/animate-ui/components/radix/sheet";

/**
 * Paxawa v2 — the place detail, Airbnb-style.
 *
 * A swipeable photo gallery up top, then clean sectioned content with real
 * breathing room (about · hours · location). The action bar replaces the old
 * radio-button day grid with a single elegant day strip + one "Add to plan"
 * button. Discover-fix brief: an Animate UI bottom Sheet on every breakpoint
 * (spring entry, Radix-managed state) — no more custom aside/slide-over.
 */
const CAT_KEY: Record<string, string> = {
  eat: "discover.catEat", coffee: "discover.catCoffee", sight: "discover.catSight",
  nightlife: "discover.catNightlife", shopping: "discover.catShopping",
  activity: "discover.catActivity", stay: "discover.catStay", other: "discover.catOther",
};

export function PlaceDetailPanel({
  scored, open, tripId, days, center, saved, crewSize = 1, isOwner = false, onClose, onSave, onAdded, onUndone,
}: {
  scored: ScoredPlace | null;
  open: boolean;
  tripId: string;
  days: string[];
  center: [number, number] | null;
  saved: boolean;
  crewSize?: number;
  isOwner?: boolean;
  onClose: () => void;
  onSave: () => void;
  onAdded: (placeId: string) => void;
  /** §10.7: reverts the card's "In plan" state after a toast Undo. */
  onUndone?: (placeId: string) => void;
}) {
  const t = useT();
  const router = useRouter();
  const base = scored?.place ?? null;
  const [enriched, setEnriched] = useState<Place | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(days[0] ?? "");
  const [addedInfo, setAddedInfo] = useState<{ placeId: string; day: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [photoIdx, setPhotoIdx] = useState(0);
  const fetchedFor = useRef<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Enrich (full photos + hours + about) from the cache-backed detail endpoint.
  useEffect(() => {
    if (!open || !base) return;
    const id = base.placeId;
    if (fetchedFor.current === id) return;
    fetchedFor.current = id;
    setPhotoIdx(0);
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/discover/details?id=${encodeURIComponent(id)}&profile=detail`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (alive && data?.place) setEnriched({ ...base, ...data.place });
      } catch {
        /* keep what we have */
      }
    })();
    return () => { alive = false; };
  }, [open, base]);

  // Escape + body scroll-lock now come free from the Radix-managed Sheet.

  if ((!scored || !base) && !open) return null;

  const p: Place | null = base
    ? enriched && enriched.placeId === base.placeId ? enriched : base
    : null;

  const photos = p
    ? p.photoRefs && p.photoRefs.length > 0
      ? p.photoRefs
      : p.photoRef ? [p.photoRef] : []
    : [];
  const effectiveDay = days.includes(selectedDay) ? selectedDay : days[0] ?? "";
  const addedDay = addedInfo && p && addedInfo.placeId === p.placeId ? addedInfo.day : null;
  const price = p?.priceLevel != null && p.priceLevel > 0 ? "$".repeat(p.priceLevel) : null;
  const mapsUrl = p
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.placeId}`
    : "#";

  function scrollGallery(dir: number) {
    const el = galleryRef.current;
    if (!el) return;
    const next = Math.min(Math.max(photoIdx + dir, 0), photos.length - 1);
    (el.children[next] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setPhotoIdx(next);
  }
  function onGalleryScroll() {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    setPhotoIdx(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  }

  function handleAdd() {
    if (!p || !effectiveDay) return;
    const placeId = p.placeId;
    const place = p;
    const day = effectiveDay;
    startTransition(async () => {
      try {
        const created = await createItineraryItemFromGooglePlace({
          tripId, dayDate: day,
          place: {
            placeId: place.placeId, name: place.name, category: place.category, placeTypes: place.placeTypes,
            rating: place.rating, userRatingsTotal: place.userRatingsTotal, priceLevel: place.priceLevel,
            coords: place.coords, address: place.address, photoRef: place.photoRef,
            hoursSummary: place.hoursSummary, topTip: place.topTip,
          },
        });
        setAddedInfo({ placeId, day });
        onAdded(placeId);
        // §10.7: every add is confirmed, reversible, and traceable — Undo
        // deletes the created item; View day jumps to that itinerary day.
        toast.success(
          t("discover.addedToast", { name: place.name, day: t("itinerary.dayN", { n: days.indexOf(day) + 1 }) }),
          {
            duration: 5000,
            // Sprint 3 FIX-2: bottom-center toasts sat exactly on the detail
            // sheet's day chips; the undo toast rides on top instead.
            position: "top-center",
            action: {
              label: t("common.undo"),
              onClick: () => {
                setAddedInfo((cur) => (cur?.placeId === placeId ? null : cur));
                onUndone?.(placeId);
                deleteItineraryItem(created.id, tripId).catch(() =>
                  toast.error(t("discover.addError")),
                );
              },
            },
            cancel: {
              label: t("discover.viewDay"),
              onClick: () => router.push(`/trips/${tripId}/itinerary?day=${day}`),
            },
          },
        );
      } catch {
        toast.error(t("discover.addError"));
      }
    });
  }

  /** Owner "Ask the crew" / member "Suggest" — posts a decision card to chat. */
  function handleSuggest() {
    if (!p) return;
    startTransition(async () => {
      try {
        const res = await createDecision({
          tripId,
          proposedDay: effectiveDay || null,
          mode: isOwner ? "ask" : "suggest",
          place: {
            placeId: p.placeId, name: p.name, category: p.category, placeTypes: p.placeTypes,
            rating: p.rating, userRatingsTotal: p.userRatingsTotal, priceLevel: p.priceLevel,
            coords: p.coords, address: p.address, photoRef: p.photoRef,
            hoursSummary: p.hoursSummary, topTip: p.topTip,
          },
        });
        if (!res.ok) {
          toast(t("decisions.alreadyOpen"));
        } else {
          toast.success(t("decisions.suggestedToast"));
        }
        onClose();
      } catch {
        toast.error(t("discover.addError"));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        transition={{ type: "spring", stiffness: 150, damping: 22 }}
        className="z-50 gap-0 h-auto max-h-[92vh] rounded-t-3xl border-t border-border bg-background sm:mx-auto sm:max-w-xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{p?.name ?? ""}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-t-3xl">
          {/* Gallery */}
          <div className="relative">
            <div
              ref={galleryRef}
              onScroll={onGalleryScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none aspect-[4/3] bg-muted"
            >
              {photos.length > 0 ? (
                photos.map((ref, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={ref}
                    src={`/api/discover/photo?ref=${encodeURIComponent(ref)}&w=900`}
                    alt={`${p?.name ?? ""} ${i + 1}`}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="w-full h-full shrink-0 snap-center object-cover"
                  />
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-violet-500/20 text-5xl font-bold text-primary/40">
                  {p?.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Top controls over the gallery */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between">
              <button
                type="button" onClick={onClose} aria-label={t("common.close")}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur flex items-center justify-center text-foreground shadow-sm hover:scale-105 transition-transform"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              <button
                type="button" onClick={onSave} aria-label={t("discover.save")}
                className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur flex items-center justify-center text-foreground shadow-sm hover:scale-105 transition-transform"
              >
                <Heart className={`w-4.5 h-4.5 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            </div>

            {/* Counter + arrows */}
            {photos.length > 1 && (
              <>
                <div className="absolute bottom-3 end-3 rounded-full bg-black/55 backdrop-blur text-white text-[11px] font-semibold px-2.5 py-1 tabular-nums">
                  {photoIdx + 1} / {photos.length}
                </div>
                <div className="absolute bottom-3 start-3 hidden sm:flex items-center gap-1.5">
                  <GalleryArrow disabled={photoIdx === 0} onClick={() => scrollGallery(-1)}><ChevronLeft className="w-4 h-4" /></GalleryArrow>
                  <GalleryArrow disabled={photoIdx >= photos.length - 1} onClick={() => scrollGallery(1)}><ChevronRight className="w-4 h-4" /></GalleryArrow>
                </div>
              </>
            )}
          </div>

          {/* Content sections */}
          <div className="p-5 space-y-5">
            {/* Title */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {scored?.tags.includes("ai_pick") && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />{t("discover.tagAiPick")}
                  </span>
                )}
                {scored?.tags.includes("hidden_gem") && (
                  <span className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[11px] font-bold">{t("discover.tagHiddenGem")}</span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold tracking-[-0.01em] leading-tight">{p?.name}</h2>
              <div className="mt-2 flex items-center gap-x-2.5 gap-y-1 flex-wrap text-sm text-muted-foreground">
                {p?.rating != null && (
                  <span className="inline-flex items-center gap-1 font-bold text-foreground">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{p.rating.toFixed(1)}
                  </span>
                )}
                {p?.userRatingsTotal != null && <span>{t("discover.reviewsCount", { count: compact(p.userRatingsTotal) })}</span>}
                <span>· {t(CAT_KEY[p?.category ?? "other"] ?? CAT_KEY.other)}</span>
                {price && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">· {price}</span>}
              </div>
            </div>

            {/* About */}
            {p?.topTip && (
              <Section title={t("discover.about")}>
                <p className="text-[15px] leading-relaxed text-foreground/80">{p.topTip}</p>
              </Section>
            )}

            {/* Hours */}
            {p?.hoursSummary && (
              <Section title={t("discover.hours")}>
                <div className="flex items-center gap-2.5 text-[15px] text-foreground/80">
                  <Clock className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                  <span>{p.hoursSummary}</span>
                </div>
              </Section>
            )}

            {/* Good to know */}
            <Section title={t("discover.goodToKnow")}>
              <div className="space-y-2.5 text-[15px] text-foreground/80">
                <Row icon={Tag} label={t(CAT_KEY[p?.category ?? "other"] ?? CAT_KEY.other)} value={price ?? ""} />
                {p?.address && <Row icon={MapPin} label={p.address} />}
              </div>
            </Section>

            {/* Location */}
            <Section title={t("discover.location")}>
              <a
                href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />{t("discover.openMaps")}
              </a>
            </Section>

            <PoweredByGoogle className="pt-1" />
          </div>
        </div>

        {/* Action bar — day strip + one button (no radio grid) */}
        <div className="shrink-0 border-t bg-background/95 backdrop-blur px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 space-y-3">
          {addedDay ? (
            <button
              type="button" onClick={onClose}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold py-3.5 text-sm"
            >
              <Check className="w-5 h-5" />
              {t("discover.addedToDay", { day: t("itinerary.dayN", { n: days.indexOf(addedDay) + 1 }) })}
            </button>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-1.5">{t("itinerary.addToDay")}</p>
                <div className="-mx-1 px-1 overflow-x-auto scrollbar-none">
                  <div className="inline-flex items-center gap-1.5">
                    {days.map((d, idx) => {
                      const active = d === effectiveDay;
                      return (
                        <button
                          key={d} type="button" onClick={() => setSelectedDay(d)}
                          className={`shrink-0 rounded-2xl px-3.5 py-2 text-center transition-all ${active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground hover:bg-muted"}`}
                        >
                          <p className="text-[9px] font-bold tracking-widest uppercase opacity-80">{t("itinerary.dayN", { n: idx + 1 })}</p>
                          <p className="text-[13px] font-bold mt-0.5 whitespace-nowrap">{format(parseISO(d), "MMM d")}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Brief C: tactile ripple on the primary CTA. */}
                <RippleButton
                  type="button" onClick={handleAdd} disabled={isPending || !effectiveDay}
                  tapScale={0.95} hoverScale={1.02}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-violet-600 text-white font-bold py-3.5 text-sm shadow-lg shadow-primary/20 disabled:opacity-60 transition-opacity"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {t("discover.addToPlan")}
                  <RippleButtonRipples color="rgba(255,255,255,0.3)" />
                </RippleButton>
                {crewSize >= 2 && (
                  <button
                    type="button" onClick={handleSuggest} disabled={isPending}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl ring-1 ring-border bg-card text-foreground font-bold px-4 py-3.5 text-sm hover:bg-muted/60 disabled:opacity-60 transition-colors"
                  >
                    <Users className="w-4.5 h-4.5" />
                    {isOwner ? t("decisions.askCrew") : t("decisions.suggest")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/60 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-base font-bold mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4.5 h-4.5 text-muted-foreground shrink-0 mt-0.5" />
      <span className="flex-1">{label}</span>
      {value && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{value}</span>}
    </div>
  );
}

function GalleryArrow({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className="w-8 h-8 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur flex items-center justify-center text-foreground shadow-sm disabled:opacity-40 hover:scale-105 transition-transform"
    >
      {children}
    </button>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
