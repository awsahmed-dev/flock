"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, ArrowRight, Calendar } from "@phosphor-icons/react/dist/ssr";
import { isPast, differenceInDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { trips } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { pickSuggestedDestinations } from "@/lib/discovery/destinations";
import { getDestinationImages } from "@/lib/actions/destination-images";

type Trip = InferSelectModel<typeof trips>;

interface Props {
  trips: Trip[];
}

/**
 * v2 dashboard trips — premium, spacious cards (Airbnb/Linear language): a clean
 * image on top, then a padded white content block with the name, a calm meta
 * line, and a small status pill. Generous gaps, soft elevation, room to breathe
 * — not loud full-bleed photos. Same card mobile (1-col) and desktop (2–3 col).
 */
const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-500",
  "from-fuchsia-500 to-violet-600",
  "from-teal-500 to-emerald-600",
];

const DESTINATION_EMOJIS: Record<string, string> = {
  japan: "🗾", tokyo: "🗾", paris: "🗼", france: "🗼",
  italy: "🇮🇹", rome: "🏛️", bali: "🌴", indonesia: "🌴",
  thailand: "🐘", bangkok: "🏯", spain: "💃", barcelona: "🏖️",
  beach: "🏖️", mountain: "⛰️", ski: "⛷️", city: "🏙️",
  london: "🎡", nyc: "🗽", "new york": "🗽", dubai: "🕌",
  greece: "🏛️", santorini: "🌅", maldives: "🌊", safari: "🦁",
  malaysia: "🇲🇾", singapore: "🇸🇬", korea: "🇰🇷", seoul: "🇰🇷",
  vietnam: "🇻🇳", australia: "🦘", morocco: "🕌", egypt: "🏺",
};

function getTripEmoji(destination: string): string {
  const lower = destination.toLowerCase();
  for (const [key, emoji] of Object.entries(DESTINATION_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "✈️";
}

function getGradient(id: string): string {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

function getTripStatus(trip: Trip) {
  const now = new Date();
  const start = parseDateOnly(trip.startDate);
  const end = parseDateOnly(trip.endDate);
  if (now >= start && now <= end) {
    return { label: "Happening now", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  }
  if (isPast(end)) {
    const daysSinceEnd = differenceInDays(now, end);
    if (daysSinceEnd <= 14) {
      return { label: "Just ended", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
    }
    return { label: "Past", color: "bg-muted text-muted-foreground" };
  }
  const daysAway = differenceInDays(start, now);
  return {
    label: daysAway <= 1 ? "Tomorrow" : daysAway <= 30 ? `In ${daysAway} days` : "Upcoming",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  };
}

function TripCard({ trip }: { trip: Trip }) {
  const status = getTripStatus(trip);
  const gradient = getGradient(trip.id);
  const emoji = getTripEmoji(trip.destination);
  const nights = differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate));

  return (
    <Link href={`/trips/${trip.id}`} prefetch>
      <article className="group h-full rounded-3xl bg-card ring-1 ring-border/50 shadow-sm overflow-hidden hover:shadow-lg hover:shadow-black/[0.05] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {trip.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.heroImageUrl}
              alt={trip.destination}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[600ms] ease-out"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center text-5xl opacity-90`}>
              {emoji}
            </div>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-[17px] tracking-[-0.01em] leading-snug line-clamp-1 flex-1">
              {trip.name}
            </h3>
            <span className={`shrink-0 text-[10px] font-bold tracking-wider uppercase rounded-full px-2.5 py-1 ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground flex items-center gap-x-2 gap-y-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(parseDateOnly(trip.startDate), "MMM d")} – {format(parseDateOnly(trip.endDate), "MMM d, yyyy")}
            </span>
            <span className="text-border">·</span>
            <span className="tabular-nums">{nights}n</span>
            <span className="text-border">·</span>
            <span className="truncate">{trip.destination}</span>
          </p>
        </div>
      </article>
    </Link>
  );
}

function NewTripTile() {
  return (
    <Link href="/trips/new" prefetch>
      <article className="group h-full min-h-[120px] lg:min-h-full rounded-3xl border-2 border-dashed border-border bg-card/40 flex items-center lg:flex-col lg:justify-center gap-3.5 p-5 lg:p-8 text-start lg:text-center hover:border-primary/40 hover:bg-card transition-colors cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 lg:flex-none">
          <p className="font-semibold text-[15px] group-hover:text-primary transition-colors">New trip</p>
          <p className="text-[13px] text-muted-foreground mt-0.5 lg:max-w-[200px]">Invite your crew, start planning</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform shrink-0 lg:hidden rtl:rotate-180" />
      </article>
    </Link>
  );
}

export function TripGrid({ trips }: Props) {
  if (trips.length === 0) {
    return <OnboardingCard />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
      <NewTripTile />
    </div>
  );
}

/**
 * Inert "inspiration" teaser strip until the taste-driven destination engine
 * (logic §13.2) is wired. Premium gradient cards with breathing room.
 */
/**
 * P6 "Where to next" — real, clickable destination inspiration (replaces the
 * old "Coming soon" placeholder). Cards render instantly with a gradient; real
 * photos swap in progressively (lazy server fetch, cached) so the dashboard
 * never blocks. Tapping a card opens the create-trip flow prefilled with that
 * destination. Curated Gulf-relevant + marquee set, rotates daily.
 */
export function SuggestedTrips() {
  const t = useT();
  const { locale } = useLocale();
  const [picks] = useState(() => pickSuggestedDestinations(4));
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    getDestinationImages(picks.map((p) => p.name))
      .then((map) => alive && setImages(map))
      .catch(() => {});
    return () => { alive = false; };
  }, [picks]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {t("dashboard.whereToNext")}
        </h2>
      </div>
      <div className="flex items-stretch gap-3.5 overflow-x-auto -mx-1 px-1 pb-2 scrollbar-none">
        {picks.map((s) => {
          const region = locale === "ar" ? s.region.ar : s.region.en;
          const hook = locale === "ar" ? s.hook.ar : s.hook.en;
          const image = images[s.name];
          return (
            <Link
              key={s.name}
              href={`/trips/new?destination=${encodeURIComponent(s.name)}`}
              prefetch={false}
              className="group shrink-0 w-60 rounded-3xl overflow-hidden relative ring-1 ring-border/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`relative h-44 ${image ? "" : `bg-gradient-to-br ${s.gradient}`}`}>
                {image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={s.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  </>
                )}
                {!image && <div className="absolute -end-4 -top-4 w-20 h-20 rounded-full bg-white/15" />}
                <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
                  <span className="text-2xl drop-shadow-sm">{s.emoji}</span>
                  <div>
                    <p className="font-bold text-base leading-tight drop-shadow-sm">{s.name}</p>
                    <p className="text-[11px] font-medium opacity-90 drop-shadow-sm">{region}</p>
                    <p className="text-[11px] opacity-85 mt-1 line-clamp-1 drop-shadow-sm">{hook}</p>
                  </div>
                </div>
                <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-white/95 text-neutral-900 px-2.5 py-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("dashboard.planTrip")} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
