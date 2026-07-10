import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { CockpitCrew } from "./types";

/**
 * Phase 6 §3-B(2) / §6.5 — the Crew Pulse strip. Overlapping avatars,
 * a readiness meter, and a one-line ticker of the last unactioned crew
 * move (always ending in an action). Hidden entirely for solo trips.
 */
export function CrewPulse({
  tripId,
  crew,
  readiness,
  ticker,
}: {
  tripId: string;
  crew: CockpitCrew[];
  readiness: number;
  ticker: { text: string; eventType: string } | null;
}) {
  if (crew.length < 2) return null;
  const shown = crew.slice(0, 4);
  const extra = crew.length - shown.length;

  return (
    <section className="rounded-2xl bg-card border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2 rtl:space-x-reverse shrink-0">
          {shown.map((m) => (
            <span key={m.userId} className="rounded-full ring-2 ring-card">
              <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} seed={m.userId} size="sm" />
            </span>
          ))}
          {extra > 0 && (
            <span className="w-7 h-7 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              +{extra}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap tabular-nums">
              Trip {readiness}% ready
            </span>
          </div>
        </div>
      </div>
      <Link href={`/trips/${tripId}/huddle`} className="block mt-2 text-sm text-muted-foreground truncate">
        {ticker ? `${ticker.text} →` : "Nothing new — go heart something in Discover →"}
      </Link>
    </section>
  );
}
