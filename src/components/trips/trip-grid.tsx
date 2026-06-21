"use client";

import Link from "next/link";
import { Plus, ArrowRight, Calendar } from "lucide-react";
import { isPast, differenceInDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { trips } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";

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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
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
export function SuggestedTrips() {
  const samples = [
    { title: "Weekend in Lisbon", subtitle: "2 nights · Foodie + Cultural", emoji: "🇵🇹", gradient: "from-amber-500 to-orange-500" },
    { title: "Kyoto in autumn", subtitle: "5 nights · Cultural + Chill", emoji: "🍁", gradient: "from-rose-500 to-pink-600" },
    { title: "Iceland road loop", subtitle: "7 nights · Adventure", emoji: "🏔️", gradient: "from-cyan-500 to-blue-500" },
    { title: "Bali surf + chill", subtitle: "10 nights · Relaxed", emoji: "🌴", gradient: "from-emerald-500 to-teal-600" },
  ];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Inspiration from Paxawa
        </h2>
        <span className="text-[10px] font-medium text-muted-foreground/70">Coming soon</span>
      </div>
      <div className="flex items-stretch gap-3.5 overflow-x-auto -mx-1 px-1 pb-2 scrollbar-none">
        {samples.map((s) => (
          <div
            key={s.title}
            className={`shrink-0 w-60 rounded-3xl bg-gradient-to-br ${s.gradient} p-4 text-white relative overflow-hidden cursor-not-allowed opacity-90`}
            title="Coming soon"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/15" />
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[96px]">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="font-bold text-sm leading-tight">{s.title}</p>
                <p className="text-[11px] opacity-85 mt-0.5">{s.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
