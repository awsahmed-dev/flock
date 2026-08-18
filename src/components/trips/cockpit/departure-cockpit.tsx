import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { Suitcase as Luggage, Users } from "@phosphor-icons/react/dist/ssr";
import { TripPrepChecklist } from "@/components/trips/trip-prep-checklist";
import { buildDeck } from "@/lib/deck";
import { HeroCard, NoteRow, DeckFooter } from "./deck";
import { DepartureHead } from "./departure-head";
import { tripMoment } from "@/lib/trip-moment";
import type { CockpitShared } from "./types";
import { docKindIcon } from "@/lib/document-kind";

/**
 * Phase 6 §3-D — NOW in DEPARTURE phase (start − 7d → start). Slim hero
 * with a pulsing countdown, the Departure Board (weather · flights ·
 * hotel · packing · crew readiness), a read-only Day 1 preview, the
 * collapsed prep row, and the metric grid.
 */
type T = (key: string, params?: Record<string, string | number>) => string;

export async function DepartureCockpit(props: CockpitShared & { t: T }) {
  const {
    tripId, name, destination, startDate, endDate, heroImageUrl, currency,
    budgetTotal, days, items, crew, packing, ticker, t, todayIso,
  } = props;
  const base = `/trips/${tripId}`;
  const moment = tripMoment({ startDate, endDate }, todayIso);
  const planPlaceIds = new Set(items.map((it) => it.googlePlaceId).filter(Boolean));
  const day1Items = items.filter((it) => it.dayDate === startDate).sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  const deck = buildDeck({
    moment, base, destinationCity: destination.split(",")[0].trim(), startDate, heroImageUrl,
    crewCount: crew.length, primaryKey: "departure",
    hearts: props.teaser.map((p) => ({ placeId: p.placeId, name: p.name, hearts: p.hearts, photoUrl: p.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=800` : null, onPlan: planPlaceIds.has(p.placeId) })),
    day1: { count: day1Items.length, firstTime: day1Items[0]?.startTime?.slice(0, 5) ?? null, firstTitle: day1Items[0]?.title ?? null, photoUrl: day1Items.find((it) => it.photoUrl)?.photoUrl ?? null },
    weather: props.weather, fx: props.fx,
    money: { currency, budget: budgetTotal, perPerson: budgetTotal != null && crew.length > 1 ? budgetTotal / crew.length : null, spent: props.spent },
    docsCount: props.documents.length, ticker: ticker ? { text: ticker.text } : null,
  });
  const daysUntil = Math.max(0, differenceInCalendarDays(parseDateOnly(startDate), new Date()));
  const dateLabel = dfFormat(parseDateOnly(startDate), "EEE d MMM");

  // Weather for the start date — open-meteo, no API key. Row hidden on any
  // failure (§3-D: no placeholder).
  const coords = items.find((i) => i.lat != null && i.lng != null);
  let weather: { tempMax: number; key: string } | null = null;
  if (coords) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weather_code,temperature_2m_max&start_date=${startDate}&end_date=${startDate}&timezone=auto`,
        { next: { revalidate: 10800 } },
      );
      if (res.ok) {
        const data = await res.json();
        const code = data?.daily?.weather_code?.[0];
        const tempMax = data?.daily?.temperature_2m_max?.[0];
        if (typeof tempMax === "number" && typeof code === "number") {
          weather = { tempMax: Math.round(tempMax), key: wmoKey(code) };
        }
      }
    } catch {
      /* row hidden */
    }
  }

  // Sprint 5: booking anchors are gone — the board shows the documents
  // pinned to departure day / day 2 (boarding passes, hotel confirmations).
  const day1 = days[0];
  const boardDocs = props.documents.filter((d) => d.dayDate === day1 || d.dayDate === days[1]);

  const day1Stops = items
    .filter((i) => i.dayDate === day1)
    .sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));

  const packLeft = packing.total - packing.packed;
  const packUrgent = packing.total > 0 && packing.packed / packing.total < 0.5 && daysUntil <= 1;

  return (
    <main className="bg-background text-foreground min-h-svh">
      {/* 1. SLIM HERO (180px) with pulsing countdown. */}
      <div className="relative w-full overflow-hidden" style={{ height: 180 }}>
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt={destination} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/60" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 20%, rgba(0,0,0,0.88))" }} />
        <div className="absolute bottom-0 inset-x-0 px-4 pb-3 flex items-end justify-between gap-3">
          <h1 className="text-white" style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>
            {name}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 shrink-0" style={{ fontSize: 12, fontWeight: 700, background: "var(--clr-horizon-dim)", color: "var(--clr-horizon)", border: "1px solid var(--clr-horizon)" }}>
            {daysUntil <= 0 ? t("cockpit.badgeTodayFly") : t("cockpit.badgeInDays", { count: daysUntil })}
            {daysUntil > 0 && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ animation: "pulse 2s ease-in-out infinite", background: "var(--clr-horizon)" }} />
            )}
          </span>
        </div>
      </div>

      <div
        className="flex flex-col gap-4 px-4 pt-4 max-w-2xl mx-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
      >
        {/* Step 6: the same ticket + horizon language as PLANNING and LIVE,
            above the board. */}
        <DepartureHead
          base={base}
          destinationCity={destination.split(",")[0].trim()}
          daysToStart={moment.daysToStart}
          startDate={startDate}
          budget={{ has: budgetTotal != null && budgetTotal > 0, due: moment.due.budget }}
          docs={{ count: props.documents.length, due: moment.due.docs }}
          packing={{ packed: packing.packed, total: packing.total, due: moment.due.packing }}
        />

        {/* 2. DEPARTURE BOARD. */}
        <section className="rounded-3xl bg-card border border-border overflow-hidden" style={{ fontVariantNumeric: "tabular-nums" }}>
          <div className="px-4 pt-3 pb-2">
            <p className="text-[12px] font-semibold tracking-[1.2px] uppercase text-muted-foreground">{t("cockpit.departure")}</p>
            <p className="text-[15px] font-bold text-foreground mt-0.5">
              {destination} · {dateLabel}
            </p>
          </div>

          {weather && (
            <BoardRow>
              ⛅ {weather.tempMax}° {t(weather.key)} {dfFormat(parseDateOnly(startDate), "EEEE")}
              {/(Rain|Drizzle|Thunder)/.test(weather.key) ? t("cockpit.rainLayer") : ""}
            </BoardRow>
          )}

          {boardDocs.length > 0 ? (
            boardDocs.map((d) => (
              <BoardRow key={d.id}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
                  <span className="truncate">
                    <span aria-hidden className="me-1.5">{docKindIcon(d.type)}</span>
                    {d.title}
                  </span>
                  <span className="text-primary font-bold shrink-0 ms-2">{t("cockpit.openDoc")}</span>
                </a>
              </BoardRow>
            ))
          ) : (
            <BoardRow>
              <span className="flex items-center justify-between w-full">
                <span className="text-muted-foreground">{t("cockpit.boardAddConfirmations")}</span>
                <Link href={`${base}/huddle?tab=docs`} className="text-primary font-bold">
                  [+]
                </Link>
              </span>
            </BoardRow>
          )}

          <BoardRow>
            <span className="flex items-center justify-between w-full">
              <span className={packUrgent ? "font-semibold" : ""}>
                <Luggage size={16} className="inline me-1.5 -mt-0.5" />
                {t("cockpit.packingLine", { packed: packing.packed, total: packing.total })}
                {packLeft > 0 ? ` — ${t("cockpit.packLeft", { count: packLeft })}` : " ✓"}
              </span>
              <Link href={`${base}/pack`} className="text-primary font-bold text-[13px]">
                {t("cockpit.packNow")}
              </Link>
            </span>
          </BoardRow>

          {crew.length > 1 && (
            <BoardRow>
              <span className="text-muted-foreground text-[13px]">
                <Users size={16} className="inline me-1.5 -mt-0.5" />
                {crew
                  .slice(0, 3)
                  .map((m) => t("cockpit.joined", { name: m.displayName.split(" ")[0] }))
                  .join(" · ")}
              </span>
            </BoardRow>
          )}
        </section>

        {/* 3. DAY 1 PREVIEW — read-only compact timeline. */}
        {day1Stops.length > 0 && (
          <section>
            <p className="text-[15px] font-bold text-foreground mb-2">{t("cockpit.firstDayGlance")}</p>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border/60">
              {day1Stops.slice(0, 6).map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 h-12"
                  style={
                    s.stopType !== "regular"
                      ? { borderInlineStart: "3px solid var(--clr-horizon)", background: "var(--clr-horizon-dim)" }
                      : undefined
                  }
                >
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-[14px] font-semibold truncate">{s.title}</span>
                  {s.startTime && (
                    <span className="text-[12px] text-muted-foreground tabular-nums">{s.startTime.slice(0, 5)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. COLLAPSED PREP ROW. */}
        <TripPrepChecklist
          base={base}
          hasDates={!!startDate}
          crewCount={crew.length}
          stopsCount={items.length}
          hasBudget={budgetTotal != null && budgetTotal > 0}
          packedCount={packing.packed}
          packTotal={packing.total}
          collapsedOnly
        />

        {/* 5. THE DECK (follow-up): the same hero → notes → footer as
            PLANNING, replacing the crew card above and the metric row here. */}
        <div className="flex flex-col gap-3 mt-3">
          {deck.hero && <HeroCard card={deck.hero} />}
          {deck.notes.length > 0 && (
            <div className="flex flex-col gap-2">
              {deck.notes.map((c, i) => <NoteRow key={c.kind} card={c} index={i} />)}
            </div>
          )}
        </div>
        <DeckFooter
          crew={crew}
          text={t("cockpit.deck.footer", {
            crew: crew.length,
            stops: items.length,
            budget: budgetTotal != null && budgetTotal > 0 ? `${currency} ${Math.round(budgetTotal).toLocaleString()}` : "",
          }).replace(/\s·\s$/, "")}
        />
      </div>
    </main>
  );
}

function BoardRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center min-h-11 px-4 py-2 border-t border-border/60 text-[14px] text-foreground">
      {children}
    </div>
  );
}


/** WMO weather code → short human description (open-meteo codes). */
function wmoKey(code: number): string {
  if (code === 0) return "cockpit.weatherClear";
  if (code <= 3) return "cockpit.weatherPartlyCloudy";
  if (code <= 48) return "cockpit.weatherFoggy";
  if (code <= 57) return "cockpit.weatherDrizzle";
  if (code <= 67) return "cockpit.weatherRain";
  if (code <= 77) return "cockpit.weatherSnow";
  if (code <= 82) return "cockpit.weatherRainShowers";
  if (code <= 86) return "cockpit.weatherSnowShowers";
  return "cockpit.weatherThunder";
}

