"use client";

import { Package, FileText, Wallet, MapPin, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import { Ticket, QuietAction } from "./ticket";
import { Horizon, runwayPos, type HorizonMarkState } from "./horizon";
import { NEAR_DAYS, PACK_DAYS } from "@/lib/trip-moment";

/**
 * Step 6 — DEPARTURE's ticket + horizon. The cockpit itself is a server
 * component (it fetches weather), and icons/components can't cross to the
 * client, so it hands this client head plain facts and gets the same
 * ticket + horizon language as PLANNING and LIVE.
 *
 * Ticket rule (what is DUE in the last week):
 *   packing due (≤ T−2) and under half   → dune  "Pack — N left"
 *   no confirmations at all               → horizon "Add your confirmations"
 *   otherwise                            → quiet "All set · N days" → Day 1
 */
export function DepartureHead({
  base, destinationCity, daysToStart, startDate,
  budget, docs, packing,
}: {
  base: string; destinationCity: string; daysToStart: number; startDate: string;
  budget: { has: boolean; due: boolean };
  docs: { count: number; due: boolean };
  packing: { packed: number; total: number; due: boolean };
}) {
  const t = useT();
  const packLeft = packing.total - packing.packed;
  const packedHalf = packing.total > 0 && packing.packed / packing.total >= 0.5;
  const state = (ok: boolean, due: boolean): HorizonMarkState => (ok ? "done" : due ? "due" : "later");
  const marks = [
    { at: runwayPos(NEAR_DAYS), label: t("cockpit.hz.budget"), icon: Wallet, state: state(budget.has, budget.due), href: `${base}/settings` },
    { at: runwayPos(7), label: t("cockpit.hz.docs"), icon: FileText, state: state(docs.count > 0, docs.due), href: `${base}/huddle?tab=docs` },
    { at: runwayPos(PACK_DAYS), label: t("cockpit.hz.pack"), icon: Package, state: state(packedHalf, packing.due), href: `${base}/pack` },
  ];
  return (
    <>
      {packing.due && !packedHalf && packing.total > 0 ? (
        <Ticket hue="dune" kicker={t("cockpit.tk.dueNow")} title={t("cockpit.tk.packLeft", { count: packLeft })} sub={t("cockpit.tk.packSub", { count: Math.max(0, daysToStart) })} icon={Package} href={`${base}/pack`} go={t("cockpit.tk.go")} />
      ) : docs.count === 0 ? (
        <Ticket hue="horizon" kicker={t("cockpit.tk.docsKicker")} title={t("cockpit.tk.docsTitle")} sub={t("cockpit.tk.docsSub")} icon={FileText} onClick={() => window.dispatchEvent(new CustomEvent("paxawa:openConfirmation"))} go={t("cockpit.tk.go")} />
      ) : (
        <QuietAction icon={CheckCircle} title={t("cockpit.tk.allSet", { count: Math.max(0, daysToStart) })} nudge={t("cockpit.tk.allSetNudge")} href={`${base}/itinerary?day=${startDate}`} />
      )}
      <Horizon
        title={t("cockpit.hz.title", { count: Math.max(0, daysToStart), destination: destinationCity })}
        nowLabel={t("cockpit.hz.now", { count: Math.max(0, daysToStart) })}
        progress={runwayPos(daysToStart)}
        marks={marks}
      />
    </>
  );
}
// MapPin kept for parity with the planning ladder's icon set.
void MapPin;
