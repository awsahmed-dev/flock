"use client";

import Link from "next/link";
import { Plus, ArrowRight, Calendar, Clock, Users } from "lucide-react";
import { parseISO, isPast, differenceInDays } from "date-fns";
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
 * B4: dashboard trip list redesigned from a 3-col card grid to a tight
 * vertical row list. The old 176px gradient-hero cards meant a user
 * with 6+ trips had to scroll a screen-and-a-half just to find a name;
 * each new row is ~64px now, so 10 trips fit in one viewport.
 *
 * We trade the painterly destination art for a small gradient color
 * stripe on the left (gives each trip a colour identity without taking
 * vertical space). Hovering reveals a trailing arrow.
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
  if (now >= start && now <= end)
    return { label: "Ongoing", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
  if (isPast(end))
    return { label: "Past", color: "bg-muted text-muted-foreground border-border" };
  const daysAway = differenceInDays(start, now);
  return {
    label: daysAway <= 0 ? "Today" : daysAway <= 7 ? `In ${daysAway}d` : daysAway <= 30 ? `${daysAway} days` : "Upcoming",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  };
}

export function TripGrid({ trips }: Props) {
  if (trips.length === 0) {
    return <OnboardingCard />;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
      {trips.map((trip) => {
        const status = getTripStatus(trip);
        const gradient = getGradient(trip.id);
        const emoji = getTripEmoji(trip.destination);
        const nights = differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate));

        return (
          <Link key={trip.id} href={`/trips/${trip.id}`} prefetch>
            <div className="group flex items-center gap-3 ps-0 pe-3 py-2.5 hover:bg-accent/40 transition-colors cursor-pointer">
              {/* Color stripe + photo (or emoji fallback) — Unsplash hero
                  for the destination gives each trip its own visual hook
                  in the list. */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className={`w-1 self-stretch rounded-full bg-gradient-to-b ${gradient}`} />
                {trip.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trip.heroImageUrl}
                    alt={trip.destination}
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-lg shrink-0">
                    {emoji}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm truncate">{trip.name}</p>
                  <span className={`text-[10px] font-bold tracking-widest uppercase border rounded-full px-2 py-0.5 ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {format(parseDateOnly(trip.startDate), "MMM d")} – {format(parseDateOnly(trip.endDate), "MMM d, yyyy")}
                  </span>
                  <span className="mx-1.5">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {nights}n
                  </span>
                  <span className="mx-1.5">·</span>
                  <span className="truncate">{trip.destination}</span>
                </p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 rtl:rotate-180" />
            </div>
          </Link>
        );
      })}

      {/* New trip row — same height as a trip row, dashed accent */}
      <Link href="/trips/new" prefetch>
        <div className="group flex items-center gap-3 ps-3 pe-3 py-2.5 hover:bg-accent/40 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-xl border-2 border-dashed border-border group-hover:border-primary/40 flex items-center justify-center shrink-0 transition-colors">
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              New trip
            </p>
            <p className="text-[11px] text-muted-foreground/70">Invite your crew, start planning</p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 rtl:rotate-180" />
        </div>
      </Link>
    </div>
  );
}

/**
 * B4: placeholder for the "suggested trips" horizontal carousel. Renders
 * an inert teaser strip until we wire the Paxawa-curated plans backend.
 * Lives in this file so dashboard/page.tsx can render <SuggestedTrips />
 * without touching new imports.
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Inspiration from Paxawa
        </h2>
        <span className="text-[10px] font-medium text-muted-foreground/70">Coming soon</span>
      </div>
      <div className="flex items-stretch gap-3 overflow-x-auto -mx-1 px-1 pb-2 scrollbar-none">
        {samples.map((s) => (
          <div
            key={s.title}
            className={`shrink-0 w-56 rounded-2xl bg-gradient-to-br ${s.gradient} p-3 text-white relative overflow-hidden cursor-not-allowed opacity-80`}
            title="Coming soon"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/15" />
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[88px]">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="font-bold text-sm leading-tight">{s.title}</p>
                <p className="text-[11px] opacity-80 mt-0.5">{s.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
