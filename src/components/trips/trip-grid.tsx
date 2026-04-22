"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Plus, ArrowRight } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import type { trips } from "@/lib/db/schema";
import type { InferSelectModel } from "drizzle-orm";

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

function getTripStatus(trip: Trip): {
  label: string;
  className: string;
} {
  const now = new Date();
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);

  if (now >= start && now <= end)
    return { label: "Ongoing", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" };
  if (isPast(end))
    return { label: "Past", className: "bg-muted text-muted-foreground border-border" };
  return { label: "Upcoming", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" };
}

export function TripGrid({ trips }: Props) {
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-4xl mb-6 shadow-lg shadow-primary/25">
          ✈️
        </div>
        <h3 className="font-semibold text-xl mb-2">No trips yet</h3>
        <p className="text-muted-foreground text-sm mb-8 max-w-xs leading-relaxed">
          Create your first trip and invite your crew to start planning together.
        </p>
        <Link href="/trips/new">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 border-0 shadow-md shadow-primary/25">
            <Plus className="w-4 h-4" />
            Create a trip
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {trips.map((trip) => {
        const status = getTripStatus(trip);
        const gradient = getGradient(trip.id);
        const emoji = getTripEmoji(trip.destination);

        return (
          <Link key={trip.id} href={`/trips/${trip.id}`}>
            <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              {/* Gradient banner */}
              <div className={`h-28 bg-gradient-to-br ${gradient} p-5 flex flex-col justify-between relative overflow-hidden`}>
                {/* Decorative circle */}
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full bg-white/10" />

                <div className="flex items-start justify-between relative z-10">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.className} bg-white/90 dark:bg-black/40`}>
                    {status.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{emoji}</span>
                    <div>
                      <h3 className="font-bold text-white leading-tight text-base line-clamp-1">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                  <span>
                    {format(parseISO(trip.startDate), "MMM d")} –{" "}
                    {format(parseISO(trip.endDate), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* New trip card */}
      <Link href="/trips/new">
        <div className="group rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-primary/3 transition-all duration-200 cursor-pointer min-h-[168px] flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              New trip
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Create & invite your crew
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
