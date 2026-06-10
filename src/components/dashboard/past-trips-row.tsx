"use client";

import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import type { trips as tripsTable } from "@/lib/db/schema";
import { Calendar, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { useT } from "@/components/i18n/locale-provider";

type Trip = InferSelectModel<typeof tripsTable>;

/**
 * B24: horizontal-scroll row of past trips. Mirrors the inspiration row
 * visually so finished trips feel like a "memories" surface rather than
 * dead rows in the active list. Each card is a small portrait tile with
 * the trip's Unsplash hero + name + dates.
 */
export function PastTripsRow({ trips }: { trips: Trip[] }) {
  const t = useT();
  if (trips.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {t("dashboard.pastTripsHeading")}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">· {trips.length}</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {trips.map((trip) => {
          const nights = differenceInDays(
            parseDateOnly(trip.endDate),
            parseDateOnly(trip.startDate),
          );
          return (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              prefetch
              className="group shrink-0 w-44 rounded-2xl border border-border bg-card overflow-hidden hover:border-foreground/15 hover:-translate-y-0.5 transition-all"
            >
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {trip.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trip.heroImageUrl}
                    alt={trip.destination}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute top-2 start-2 text-[9px] font-bold tracking-widest uppercase bg-white/15 backdrop-blur-md text-white rounded-full px-2 py-0.5">
                  {t("trip.past")}
                </span>
                <div className="absolute bottom-2 start-2 end-2">
                  <p className="font-extrabold text-sm text-white truncate">
                    {trip.name}
                  </p>
                  <p className="text-[10px] text-white/80 truncate">
                    {trip.destination}
                  </p>
                </div>
              </div>
              <div className="p-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {format(parseDateOnly(trip.startDate), "d MMM")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {nights}n
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
