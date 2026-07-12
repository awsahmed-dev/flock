import Link from "next/link";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { format as isoFmt } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Phase 6 §3-B(4) — the itinerary strip: a "Plan days →" full-width row
 * plus a horizontal day-pill rail. Today (if inside the trip) is filled
 * accent; other days are quiet surfaces with accent text (§7.1: no purple
 * picket fence).
 */
export function DayPillRail({
  tripId,
  days,
  stopCountByDay,
}: {
  tripId: string;
  days: string[];
  stopCountByDay: Record<string, number>;
}) {
  const base = `/trips/${tripId}`;
  const todayIso = isoFmt(new Date(), "yyyy-MM-dd");

  return (
    <section>
      <Link
        href={`${base}/itinerary`}
        className="flex items-center justify-between h-[52px] px-4 rounded-2xl bg-card border border-border font-bold text-[15px] text-foreground active:scale-[0.99] transition-transform"
      >
        Plan days
        <ChevronRight size={18} className="text-muted-foreground rtl:rotate-180" />
      </Link>
      {days.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
          {days.map((d) => {
            const count = stopCountByDay[d] ?? 0;
            const isToday = d === todayIso;
            const dt = parseDateOnly(d);
            return (
              <Link
                key={d}
                href={`${base}/itinerary?day=${d}`}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-2 shrink-0 w-14 border ${
                  isToday ? "text-white" : "bg-muted border-border"
                }`}
                style={isToday ? { background: "var(--clr-wayfind)", borderColor: "var(--clr-wayfind)" } : undefined}
              >
                <span className={`text-[10px] font-semibold uppercase ${isToday ? "text-white/75" : "text-muted-foreground"}`}>
                  {dfFormat(dt, "EEE")}
                </span>
                <span className={`text-[15px] font-bold ${isToday ? "text-white" : "text-foreground"}`}>
                  {dfFormat(dt, "d")}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${count > 0 ? (isToday ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
