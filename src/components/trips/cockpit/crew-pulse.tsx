"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { CockpitCrew } from "./types";

/**
 * Phase 6 §3-B(2) / §6.5 — the Crew Pulse strip. Overlapping avatars and
 * a one-line ticker of the last unactioned crew move (always ending in
 * an action). Hidden entirely for solo trips.
 *
 * Sprint 9 FIX-4+5: the readiness meter is gone — it duplicated the
 * "Trip N% ready" bar sitting right above this strip. In its place the
 * row says how many people are going, so the avatar dots don't need
 * counting to be understood.
 */
export function CrewPulse({
  tripId,
  crew,
  ticker,
}: {
  tripId: string;
  crew: CockpitCrew[];
  ticker: { text: string; eventType: string } | null;
}) {
  const t = useT();
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
        <p className="flex-1 min-w-0 text-[14px] font-bold text-foreground truncate">
          {t("cockpit.going", { count: crew.length })}
        </p>
      </div>
      <Link href={`/trips/${tripId}/huddle`} className="block mt-2 text-sm text-muted-foreground truncate">
        {ticker ? `${ticker.text} →` : t("cockpit.tickerEmpty")}
      </Link>
    </section>
  );
}
