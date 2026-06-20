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
  // B23: vocabulary unified with trip-overview's status labels. Was a
  // mix of "Ongoing / Today / In 7d / 29 days / Upcoming / Past" which
  // didn't match the inside-trip "Happening now / Starts in N days /
  // Just ended / Past" the user sees once they tap in.
  if (now >= start && now <= end) {
    return { label: "Happening now", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
  }
  if (isPast(end)) {
    const daysSinceEnd = differenceInDays(now, end);
    if (daysSinceEnd <= 14) {
      return { label: "Just ended", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
    }
    return { label: "Past", color: "bg-muted text-muted-foreground border-border" };
  }
  const daysAway = differenceInDays(start, now);
  return {
    label:
      daysAway <= 1
        ? "Tomorrow"
        : daysAway <= 30
          ? `In ${daysAway} days`
          : "Upcoming",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  };
}

export function TripGrid({ trips }: Props) {
  if (trips.length === 0) {
    return <OnboardingCard />;
  }

  return (
    <>
      {/* Mobile: premium image cards (single column), matching the cinematic
          v2 language — photo-led with the status pill + name over a scrim. */}
      <div className="lg:hidden space-y-3">
        {trips.map((trip) => {
          const status = getTripStatus(trip);
          const gradient = getGradient(trip.id);
          const emoji = getTripEmoji(trip.destination);
          const nights = differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate));

          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} prefetch>
              <article className="group relative rounded-3xl overflow-hidden ring-1 ring-border/50 shadow-sm active:scale-[0.99] transition-transform cursor-pointer aspect-[16/10] bg-muted">
                {trip.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trip.heroImageUrl}
                    alt={trip.destination}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center text-6xl opacity-90`}>
                    {emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20 pointer-events-none" />
                <span className={`absolute top-3 start-3 text-[10px] font-bold tracking-widest uppercase border rounded-full px-2.5 py-1 backdrop-blur-md ${status.color}`}>
                  {status.label}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-extrabold text-xl text-white tracking-[-0.01em] leading-tight drop-shadow line-clamp-1">{trip.name}</h3>
                  <div className="mt-1.5 flex items-center gap-2 text-white/85 text-[13px]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(parseDateOnly(trip.startDate), "MMM d")} – {format(parseDateOnly(trip.endDate), "MMM d")}
                    </span>
                    <span className="opacity-60">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">{nights}n</span>
                    <span className="opacity-60">·</span>
                    <span className="truncate">{trip.destination}</span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}

        <Link href="/trips/new" prefetch>
          <article className="group flex items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card px-4 py-4 active:scale-[0.99] transition-transform cursor-pointer">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[15px]">{"New trip"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Invite your crew, start planning</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform shrink-0 rtl:rotate-180" />
          </article>
        </Link>
      </div>

      {/* B27: desktop grid — 2 cols on lg, 3 on xl. Each trip becomes a
          richer photo-led card with the hero image filling the top half,
          status pill floating on the image, meta row below. Hover lifts
          + tints the card border + scales the photo subtly — small
          interactions that compound into the "this is a real desktop
          app" feel. */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-4">
        {trips.map((trip) => {
          const status = getTripStatus(trip);
          const gradient = getGradient(trip.id);
          const emoji = getTripEmoji(trip.destination);
          const nights = differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate));

          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} prefetch>
              <article className="group rounded-3xl ring-1 ring-border/50 bg-card overflow-hidden shadow-sm hover:ring-border hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.06] transition-all cursor-pointer h-full">
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {trip.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trip.heroImageUrl}
                      alt={trip.destination}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center text-6xl opacity-90`}>
                      {emoji}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
                  <span className={`absolute top-3 start-3 text-[10px] font-bold tracking-widest uppercase border rounded-full px-2.5 py-0.5 backdrop-blur ${status.color}`}>
                    {status.label}
                  </span>
                  <div className="absolute bottom-3 start-3 end-3">
                    <p className="font-extrabold text-base text-white truncate drop-shadow">
                      {trip.name}
                    </p>
                    <p className="text-xs text-white/85 truncate">
                      {trip.destination}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(parseDateOnly(trip.startDate), "MMM d")} – {format(parseDateOnly(trip.endDate), "MMM d")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {nights}n
                  </span>
                </div>
              </article>
            </Link>
          );
        })}

        {/* New trip tile — same card footprint, dashed accent */}
        <Link href="/trips/new" prefetch>
          <article className="group rounded-2xl border-2 border-dashed border-border bg-card overflow-hidden hover:border-primary/40 hover:-translate-y-0.5 transition-all cursor-pointer h-full flex flex-col items-center justify-center min-h-[260px] py-8 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <p className="font-bold text-base group-hover:text-primary transition-colors">
              New trip
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px]">
              Invite your crew, start planning together
            </p>
          </article>
        </Link>
      </div>
    </>
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
