"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Plus, ArrowRight, Clock } from "lucide-react";
import { format, parseISO, isPast, isFuture, differenceInDays } from "date-fns";
import type { trips } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";

type Trip = InferSelectModel<typeof trips>;

interface Props {
  trips: Trip[];
}

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
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  if (now >= start && now <= end)
    return { label: "Ongoing", dot: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-400" };
  if (isPast(end))
    return { label: "Past", dot: "bg-slate-400", text: "text-muted-foreground" };
  const daysAway = differenceInDays(start, now);
  return {
    label: daysAway <= 7 ? `In ${daysAway}d` : daysAway <= 30 ? `${daysAway} days` : "Upcoming",
    dot: "bg-blue-400",
    text: "text-blue-600 dark:text-blue-400",
  };
}

export function TripGrid({ trips }: Props) {
  if (trips.length === 0) {
    // First-run dashboard — illustrated onboarding card. The bare "No trips
    // yet" empty state was a known conversion killer; this sets expectations
    // and drives the first action.
    return <OnboardingCard />;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trips.map((trip) => {
        const status = getTripStatus(trip);
        const gradient = getGradient(trip.id);
        const emoji = getTripEmoji(trip.destination);
        const nights = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate));

        return (
          <Link key={trip.id} href={`/trips/${trip.id}`}>
            <div className="group rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-lg hover:shadow-black/8 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
              {/* Gradient hero */}
              <div className={`relative h-32 bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between overflow-hidden`}>
                <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-white/10" />
                <div className="absolute right-8 bottom-0 w-16 h-16 rounded-full bg-black/8" />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    <span className="text-[11px] font-semibold text-white/90 uppercase tracking-wide">
                      {status.label}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/50 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl leading-none">{emoji}</span>
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight line-clamp-1">
                        {trip.name}
                      </h3>
                      <p className="text-white/75 text-xs mt-0.5 truncate">{trip.destination}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {format(parseISO(trip.startDate), "MMM d")} – {format(parseISO(trip.endDate), "MMM d")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{nights}n</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* New trip card */}
      <Link href="/trips/new">
        <div className="group rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-transparent hover:bg-primary/3 transition-all duration-200 cursor-pointer min-h-[176px] flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-11 h-11 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              New trip
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Invite your crew</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
