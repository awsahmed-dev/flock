import Link from "next/link";
import { Sparkles, UserPlus, MapPin, Wallet, Users, Backpack } from "lucide-react";

export interface PreStartDay {
  key: string;
  label: string; // day number
  hasItems: boolean;
  isToday: boolean;
}

/**
 * Pre-start trip overview (redesign brief Screen H). Shown for trips that
 * haven't started yet — a light-themed briefing: hero, a map card, a day
 * timeline, a 2×2 stats grid (quality labels, tappable), and the AI-plan +
 * invite quick actions. Started trips render the dark NOW cockpit instead.
 */
export function PreStartOverview({
  tripId,
  name,
  destination,
  dates,
  daysUntil,
  heroImageUrl,
  staticMapUrl,
  days,
  placesCount,
  crewCount,
  packing,
  budget,
}: {
  tripId: string;
  name: string;
  destination: string;
  dates: string;
  daysUntil: number;
  heroImageUrl: string | null;
  staticMapUrl: string | null;
  days: PreStartDay[];
  placesCount: number;
  crewCount: number;
  packing: { packed: number; total: number };
  budget: { total: number | null; currency: string };
}) {
  const base = `/trips/${tripId}`;
  return (
    <div
      className="min-h-svh bg-background text-foreground"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* Hero — 4-E: min 260px so the name + dates aren't cramped. */}
      <div className="relative min-h-[260px] rounded-b-3xl overflow-hidden">
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt={destination} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-violet-800/50" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 p-5 pe-24">
          <h1 className="type-h1 text-white font-bold">{name}</h1>
          <p className="type-body-sm text-white/80 mt-1">{destination} · {dates}</p>
        </div>
        {/* 0-D: countdown chip. */}
        <span className="absolute bottom-5 end-5 rounded-full bg-primary text-white text-[11px] font-bold px-3 py-1 tracking-wide">
          {daysUntil <= 0 ? "TODAY" : `IN ${daysUntil} ${daysUntil === 1 ? "DAY" : "DAYS"}`}
        </span>
      </div>

      <div className="px-4 max-w-3xl mx-auto space-y-5 mt-5">
        {/* Map card → full map */}
        {staticMapUrl && (
          <Link href={`${base}/itinerary`} className="block relative h-[180px] rounded-2xl overflow-hidden ring-1 ring-border active:scale-[0.99] transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={staticMapUrl} alt="Trip map" className="w-full h-full object-cover" />
            <span className="absolute bottom-3 end-3 rounded-full bg-background/90 px-3 py-1 text-xs font-bold">Open map</span>
          </Link>
        )}

        {/* Day timeline */}
        {days.length > 0 && (
          <div>
            <p className="type-caption text-tertiary mb-2">Itinerary</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
              {days.map((d) => (
                <div
                  key={d.key}
                  className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                    d.hasItems
                      ? "bg-primary text-white"
                      : "border-2 border-primary bg-transparent text-primary"
                  } ${d.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2×2 stats — quality labels, tappable */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard href={`${base}/itinerary`} icon={MapPin} label="Places planned" value={placesCount > 0 ? `${placesCount} stops` : "None yet"} />
          <StatCard href={`${base}/expenses`} icon={Wallet} label="Budget" value={budget.total != null ? `${budget.currency} ${Math.round(budget.total).toLocaleString()}` : "Open"} />
          <StatCard href={`${base}/members`} icon={Users} label="Crew" value={crewCount === 1 ? "1 person" : `${crewCount} people`} />
          <StatCard href={`${base}/pack`} icon={Backpack} label="Packing" value={`${packing.packed}/${packing.total}`} />
        </div>

        {/* Quick actions */}
        <div className="space-y-2 pt-1">
          <Link href={`${base}/discover`} className="flex items-center justify-center gap-1.5 h-12 rounded-full bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform elev-sm">
            <Sparkles className="w-5 h-5" /> Plan my trip
          </Link>
          <Link href={`${base}/members`} className="flex items-center justify-center gap-1.5 h-11 rounded-full ring-1 ring-border font-semibold text-foreground active:scale-[0.98] transition-transform">
            <UserPlus className="w-4 h-4" /> Invite more crew
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <Link href={href} className="rounded-2xl bg-card ring-1 ring-border p-4 elev-sm active:scale-[0.98] transition-transform">
      <Icon className="w-5 h-5 text-primary" />
      <p className="type-caption text-tertiary mt-2">{label}</p>
      <p className="text-xl font-extrabold tabular-nums mt-0.5">{value}</p>
    </Link>
  );
}
