"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Airplane, CaretRight, FileText, Plus, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { placeLabel } from "@/lib/airports";
import { loadFlightsPanel, type Flight, type FlightsPanel } from "@/lib/actions/flights";
import { FlightSheet, type SeedTicket } from "./flight-sheet";

/**
 * Flights, above the rest of the trip's documents — because that is where
 * people go looking for their ticket, and until now it was only a picture
 * there. Each flight opens an editor; a ticket nobody has read yet offers to
 * be read; and if the arriving flight lands somewhere the route doesn't
 * start, it says so instead of leaving the plan quietly wrong.
 *
 * Loads its own data so it can sit inside any documents surface without
 * threading props through the pages that host it.
 */
export function FlightsSection({ tripId }: { tripId: string }) {
  const [data, setData] = useState<FlightsPanel | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    loadFlightsPanel(tripId)
      .then((d) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [tripId]);
  useEffect(load, [load]);

  if (failed || !data) {
    // Quiet while loading; a failure hides the section rather than breaking
    // the documents underneath it.
    return null;
  }
  return <FlightsView tripId={tripId} data={data} onChanged={load} />;
}

/** The section itself, given its data — split out so it renders without a session. */
export function FlightsView({
  tripId,
  data,
  onChanged,
}: {
  tripId: string;
  data: FlightsPanel;
  onChanged: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [sheet, setSheet] = useState<{ flight: Flight | null; seed: SeedTicket | null } | null>(null);

  const lang = locale === "ar" ? "ar" : "en";
  const when = (date: string, time: string | null) =>
    `${format(parseDateOnly(date), "EEE d MMM")}${time ? ` · ${time}` : ""}`;

  return (
    <section className="space-y-2.5" aria-labelledby="flights-h">
      <div className="flex items-center justify-between">
        <h2 id="flights-h" className="text-[13px] font-black tracking-[0.14em] uppercase text-muted-foreground">
          {t("flights.sectionTitle")}
        </h2>
        <button
          type="button"
          onClick={() => setSheet({ flight: null, seed: null })}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-[13px] font-bold active:scale-[0.97] transition-transform"
        >
          <Plus className="w-4 h-4" /> {t("flights.add")}
        </button>
      </div>

      {data.arrivalMismatch && (
        <div className="flex gap-3 rounded-2xl border border-[color:var(--clr-horizon)]/40 bg-[color:var(--clr-horizon-dim)] p-3.5">
          <WarningCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--clr-horizon)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold">
              {t("flights.mismatch", {
                lands: placeLabel(data.arrivalMismatch.lands, lang),
                starts: lang === "ar" ? data.arrivalMismatch.routeStartsAr : data.arrivalMismatch.routeStartsEn,
              })}
            </p>
            <Link
              href={`/trips/${tripId}/shape`}
              className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold"
              style={{ color: "var(--clr-horizon)" }}
            >
              {t("flights.fixRoute")} <CaretRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      )}

      {data.unreadTickets.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => setSheet({ flight: null, seed: { url: d.url, title: d.title } })}
          className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-3.5 text-start"
        >
          <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold">{t("flights.unreadTitle")}</span>
            <span className="block text-[12px] text-muted-foreground truncate" dir="auto">{d.title}</span>
          </span>
          <span className="text-[13px] font-bold text-primary shrink-0">{t("flights.unreadAction")}</span>
        </button>
      ))}

      {data.flights.map((fl) => (
        <button
          key={fl.stopId}
          type="button"
          onClick={() => setSheet({ flight: fl, seed: null })}
          className="w-full rounded-2xl border border-border bg-card p-4 text-start active:scale-[0.99] transition-transform"
        >
          <span className="flex items-center gap-3" dir="ltr">
            <span className="text-[22px] font-black tracking-tight tabular-nums">{fl.origin ?? "—"}</span>
            <span className="flex-1 flex items-center gap-2 text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <Airplane className="w-4 h-4" weight="fill" />
              <span className="h-px flex-1 bg-border" />
            </span>
            <span className="text-[22px] font-black tracking-tight tabular-nums">{fl.destination ?? "—"}</span>
          </span>
          <span className="mt-2 flex items-center justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground tabular-nums">{when(fl.departDate, fl.departTime)}</span>
            <span className="font-semibold truncate" dir="ltr">
              {[fl.flightNumber, fl.airline].filter(Boolean).join(" · ")}
            </span>
          </span>
          {fl.ticketUrl && (
            <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <FileText className="w-3.5 h-3.5" /> {t("flights.ticketAttached")}
            </span>
          )}
        </button>
      ))}

      {data.flights.length === 0 && data.unreadTickets.length === 0 && (
        <button
          type="button"
          onClick={() => setSheet({ flight: null, seed: null })}
          className="w-full rounded-2xl border border-dashed border-border bg-card p-4 text-start"
        >
          <span className="block text-[14px] font-semibold">{t("flights.emptyTitle")}</span>
          <span className="block text-[12px] text-muted-foreground mt-0.5">{t("flights.emptyHint")}</span>
        </button>
      )}

      <FlightSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        onChanged={onChanged}
        tripId={tripId}
        tripStart={data.tripStart}
        tripEnd={data.tripEnd}
        flight={sheet?.flight ?? null}
        seedTicket={sheet?.seed ?? null}
      />
    </section>
  );
}
