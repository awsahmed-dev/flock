"use client";

import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import type { trips as tripsTable } from "@/lib/db/schema";
import { Calendar, Clock } from "@phosphor-icons/react/dist/ssr";
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
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {t("dashboard.pastTripsHeading")}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">· {trips.length}</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory">
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
              className="group shrink-0 w-60 sm:w-64 snap-start rounded-2xl border border-border bg-card overflow-hidden hover:border-foreground/15 hover:-translate-y-0.5 transition-all"
            >
              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                {trip.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trip.heroImageUrl}
                    alt={trip.destination}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute top-2.5 start-2.5 text-[10px] font-bold tracking-widest uppercase bg-white/20 backdrop-blur-md text-white rounded-full px-2 py-0.5">
                  {t("trip.past")}
                </span>
                <div className="absolute bottom-3 start-3 end-3">
                  <p className="font-extrabold text-base text-white truncate">
                    {trip.name}
                  </p>
                  <p className="text-[12px] text-white/85 truncate">
                    {trip.destination}
                  </p>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseDateOnly(trip.startDate), "d MMM yyyy")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" />
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
