"use client";

import { SheetGrip, useDismissDrag } from "@/components/ui/sheet-grip";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MagnifyingGlass as Search, X, Plus, Sparkle as Sparkles, CaretLeft as ChevronLeft, CaretRight as ChevronRight, CircleNotch as Loader2, MapPin, CalendarDots as CalendarDays } from "@phosphor-icons/react/dist/ssr";
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  format as dfFormat,
} from "date-fns";
import { createTrip } from "@/lib/actions/trips";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Trip creation — 3-step bottom sheet (redesign brief Screen B). Slides up from
 * the dashboard's "+ New trip" FAB. Step 1 destination (Google autocomplete) +
 * duration chips + name; Step 2 crew; Step 3 budget (optional). On create →
 * `createTrip` redirects to the new trip's NOW screen.
 *
 * Glass + depth + transitions per the continuation brief §0/§3. backdrop-filter
 * is inline because the build strips it from stylesheets.
 */

interface Prediction {
  placeId?: string;
  primary?: string;
  secondary?: string;
}

function predictionLabel(p: Prediction): string {
  return p.primary || "";
}
function predictionSub(p: Prediction): string {
  return p.secondary || "";
}
function predictionDestination(p: Prediction): string {
  return [p.primary, p.secondary].filter(Boolean).join(", ");
}

const ISO = (d: Date) => dfFormat(d, "yyyy-MM-dd");

export function CreateTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [durationKey, setDurationKey] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  // QA BUG-7: presets anchor to the month the user navigated to, so the
  // calendar's viewed month lives up here.
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [destinationSettled, setDestinationSettled] = useState("");

  // Step 2
  const [crew, setCrew] = useState<string[]>([]);
  const [crewInput, setCrewInput] = useState("");

  // Step 3
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [perPerson, setPerPerson] = useState(false);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStep(1);
      setError(null);
    }
  }, [open]);

  // Suggest a trip name from the destination unless the user edited it.
  // Keyed off the SETTLED destination (picked from the list, or the field
  // blurred) rather than the live keystroke value — otherwise the name box
  // flickers "T Trip" → "To Trip" → "Tok Trip" as you type.
  useEffect(() => {
    if (!nameDirty && destinationSettled) {
      const city = destinationSettled.split(",")[0].trim();
      setName(city ? `${city} Trip` : "");
    }
  }, [destinationSettled, nameDirty]);

  const DURATIONS: { key: string; label: string; days: number }[] = [
    { key: "weekend", label: t("create.durWeekend"), days: 2 },
    { key: "week", label: t("create.dur1Week"), days: 6 },
    { key: "twoweeks", label: t("create.dur2Weeks"), days: 13 },
    { key: "month", label: t("create.dur1Month"), days: 29 },
  ];

  function pickDuration(key: string, days: number) {
    // QA BUG-7: anchor to (in order) the chosen start date, the month the
    // user navigated the calendar to, or today — NOT always today. Tapping
    // "2 Weeks" while viewing August must produce an August range.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let anchor: Date;
    if (start) {
      anchor = start;
    } else if (isSameMonth(viewMonth, today)) {
      anchor = today;
    } else if (isBefore(viewMonth, today)) {
      anchor = today;
    } else {
      anchor = startOfMonth(viewMonth);
    }
    setStart(anchor);
    setEnd(addDays(anchor, days));
    setDurationKey(key);
    setShowCalendar(false);
  }

  const datesLabel = useMemo(() => {
    if (!start || !end) return null;
    return `${dfFormat(start, "d MMM")} – ${dfFormat(end, "d MMM")}`;
  }, [start, end]);

  const canNextStep1 = destination.trim().length > 1 && start && end && name.trim().length > 0;
  // A disabled control that won't say why is a dead end. One instruction at a
  // time, in step order — not a list, which doesn't translate cleanly.
  const nextBlockedReason = (() => {
    if (destination.trim().length <= 1) return t("create.needDestination");
    if (!start || !end) return t("create.needDates");
    if (name.trim().length === 0) return t("create.needName");
    return null;
  })();

  function submit() {
    if (!destination || !start || !end || !name) return;
    setError(null);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("destination", destination.trim());
    fd.set("startDate", ISO(start));
    fd.set("endDate", ISO(end));
    if (amount.trim()) fd.set("budgetTotal", amount.trim());
    // QA BUG-11: keep the per-person intent.
    fd.set("budgetType", perPerson ? "per_person" : "flat");
    fd.set("currency", currency);
    // QA BUG-2: the "Who is coming?" entries were silently discarded.
    if (crew.length > 0) fd.set("inviteEmails", JSON.stringify(crew));
    startTransition(async () => {
      try {
        // createTrip redirects to the new trip's NOW screen on success.
        await createTrip(fd);
      } catch (err) {
        // A thrown redirect is expected and handled by Next; only real errors land here.
        if (err && typeof err === "object" && "digest" in err) throw err;
        setError(err instanceof Error ? err.message : t("create.failed"));
      }
    });
  }

  const { gripProps, sheetStyle } = useDismissDrag(onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-lg bg-card text-card-foreground rounded-t-3xl sm:rounded-3xl elev-lg max-h-[92svh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
        style={sheetStyle}
      >
        {/* Handle + progress dots — the track: grab here to pull the sheet down */}
        <div {...gripProps} className="pt-1 pb-2 px-5 shrink-0">
          <SheetGrip className="pt-2 pb-1" />
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
              className="w-9 h-9 -ms-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={step === 1 ? t("common.close") : t("common.back")}
            >
              {step === 1 ? <X className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5 rtl:rotate-180" />}
            </button>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    n === step ? "w-5 bg-primary" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
            <span className="w-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {step === 1 && (
            <Step1
              t={t}
              destination={destination}
              setDestination={(v) => { setDestination(v); }}
              setDestinationSettled={setDestinationSettled}
              durations={DURATIONS}
              durationKey={durationKey}
              pickDuration={pickDuration}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
              start={start}
              end={end}
              setRange={(s, e) => { setStart(s); setEnd(e); setDurationKey("custom"); }}
              month={viewMonth}
              setMonth={setViewMonth}
              datesLabel={datesLabel}
              name={name}
              setName={(v) => { setName(v); setNameDirty(true); }}
            />
          )}
          {step === 2 && (
            <Step2
              t={t}
              crew={crew}
              crewInput={crewInput}
              setCrewInput={setCrewInput}
              addCrew={() => {
                const v = crewInput.trim();
                if (v && !crew.includes(v)) setCrew([...crew, v]);
                setCrewInput("");
              }}
              removeCrew={(v) => setCrew(crew.filter((c) => c !== v))}
            />
          )}
          {step === 3 && (
            <Step3
              t={t}
              amount={amount}
              setAmount={setAmount}
              currency={currency}
              setCurrency={setCurrency}
              perPerson={perPerson}
              setPerPerson={setPerPerson}
            />
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1.25rem)] border-t border-border bg-card">
          {step === 1 && (
            <>
              <PrimaryBtn disabled={!canNextStep1} onClick={() => setStep(2)}>
                {t("create.next")} →
              </PrimaryBtn>
              {nextBlockedReason && (
                <p className="mt-2 text-center text-[12.5px] text-muted-foreground">
                  {nextBlockedReason}
                </p>
              )}
            </>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <PrimaryBtn onClick={() => setStep(3)}>{t("create.next")} →</PrimaryBtn>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full h-10 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                {t("create.justMe")}
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <PrimaryBtn disabled={isPending} onClick={submit}>
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> {t("create.createTrip")}
                  </>
                )}
              </PrimaryBtn>
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className="w-full h-10 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {t("create.skipBudget")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 elev-sm"
    >
      {children}
    </button>
  );
}

/* ── Step 1 — Where & When ─────────────────────────────────────────────── */
function Step1({
  t,
  destination,
  setDestination,
  setDestinationSettled,
  durations,
  durationKey,
  pickDuration,
  showCalendar,
  setShowCalendar,
  start,
  end,
  setRange,
  datesLabel,
  name,
  setName,
  month,
  setMonth,
}: {
  t: (k: string, p?: Record<string, string | number>) => string;
  destination: string;
  setDestination: (v: string) => void;
  setDestinationSettled: (v: string) => void;
  durations: { key: string; label: string; days: number }[];
  durationKey: string | null;
  pickDuration: (key: string, days: number) => void;
  showCalendar: boolean;
  setShowCalendar: (v: boolean) => void;
  start: Date | null;
  end: Date | null;
  setRange: (s: Date, e: Date | null) => void;
  datesLabel: string | null;
  name: string;
  setName: (v: string) => void;
  month: Date;
  setMonth: (d: Date) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="type-h1">{t("create.whereTitle")}</h2>

      <DestinationAutocomplete
        value={destination}
        onType={setDestination}
        onPick={(v) => { setDestination(v); setDestinationSettled(v); }}
        onSettle={setDestinationSettled}
        t={t}
      />

      {/* Duration presets. They WRAP — they used to sit in a horizontal
          scroller, and at 390px "Custom" started at x=379 (11px of it on
          screen) while at 360px "1 Month" was clipped too. Four chips filled
          the width edge to edge, so nothing hinted that more existed: the
          only route to real dates was off the side of the phone. */}
      <div className="flex flex-wrap gap-2">
        {durations.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => pickDuration(d.key, d.days)}
            className={`h-10 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              durationKey === d.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* The calendar gets its own full-width row — it is a peer of the
          presets, not a fifth chip, and it can never be pushed off-screen. */}
      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className={`w-full h-12 rounded-xl px-4 flex items-center justify-between text-[15px] font-semibold transition-colors ${
          durationKey === "custom" || showCalendar
            ? "bg-secondary ring-2 ring-primary/40 text-foreground"
            : "bg-secondary text-foreground hover:bg-secondary/70"
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <CalendarDays className="w-[18px] h-[18px] shrink-0 text-muted-foreground" />
          <span className={`truncate tabular-nums ${datesLabel ? "" : "text-muted-foreground font-medium"}`}>
            {datesLabel ?? t("create.chooseDates")}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground rtl:rotate-180" />
      </button>

      {showCalendar && (
        <RangeCalendar start={start} end={end} onChange={setRange} month={month} setMonth={setMonth} />
      )}

      {/* Trip name */}
      <div>
        <label className="type-label text-muted-foreground">{t("create.nameLabel")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("create.namePlaceholder")}
          className="mt-1.5 w-full h-12 rounded-xl bg-secondary px-4 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}

/**
 * Destination field.
 *
 * The typed text IS the destination. It used to be that only clicking a
 * Google Places prediction called `onPick`, so `destination` stayed empty
 * however much you typed — and "Next" stayed greyed out with no explanation
 * whenever Places returned nothing (flaky network, quota, a typo, an obscure
 * town). The trip-name auto-fill hung off the same value, so one invisible
 * dependency killed two fields at once.
 *
 * Predictions are now a shortcut, not a gate: `onType` keeps the parent in
 * sync on every keystroke, `onPick` overwrites with the canonical name when
 * a suggestion is chosen, and `onSettle` marks the value stable (pick or
 * blur) so the name suggestion doesn't flicker mid-word.
 */
function DestinationAutocomplete({
  value,
  onType,
  onPick,
  onSettle,
  t,
}: {
  value: string;
  onType: (v: string) => void;
  onPick: (v: string) => void;
  onSettle: (v: string) => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [q, setQ] = useState(value);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [openList, setOpenList] = useState(false);
  const [loading, setLoading] = useState(false);
  const session = useRef(Math.random().toString(36).slice(2));
  // The last value chosen from the list. Suppresses the refetch that would
  // otherwise fire immediately after a pick. This used to be `value`, which
  // now changes on every keystroke — comparing against it would mean the
  // query always equalled the value and predictions never loaded at all.
  const lastPicked = useRef<string>(value);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 || query === lastPicked.current) {
      setPreds([]);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/discover/autocomplete?q=${encodeURIComponent(query)}&session=${session.current}`,
        );
        const data = await res.json().catch(() => ({}));
        setPreds(Array.isArray(data.predictions) ? data.predictions : []);
        setOpenList(true);
      } catch {
        setPreds([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="relative">
      <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); onType(e.target.value); }}
        onFocus={() => preds.length && setOpenList(true)}
        onBlur={() => onSettle(q.trim())}
        placeholder={t("create.destPlaceholder")}
        className="w-full h-12 rounded-xl bg-secondary ps-11 pe-4 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
      />
      {loading && (
        <Loader2 className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}
      {openList && preds.length > 0 && (
        <div className="absolute z-10 mt-1.5 w-full rounded-xl bg-popover text-popover-foreground elev-md ring-1 ring-border overflow-hidden max-h-64 overflow-y-auto">
          {preds.slice(0, 6).map((p, i) => (
            <button
              key={p.placeId ?? i}
              type="button"
              onClick={() => {
                const dest = predictionDestination(p);
                lastPicked.current = dest;
                onPick(dest);
                setQ(dest);
                setOpenList(false);
              }}
              className="w-full flex items-start gap-2.5 px-3.5 py-3 text-start hover:bg-secondary transition-colors border-b border-border last:border-0"
            >
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{predictionLabel(p)}</span>
                {predictionSub(p) && (
                  <span className="block text-xs text-muted-foreground truncate">{predictionSub(p)}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* A compact single-month range calendar — NO native date input (brief §5 "Do
   not use the browser's native date input"). Tap a start day, then an end day. */
function RangeCalendar({
  start,
  end,
  onChange,
  month,
  setMonth,
}: {
  start: Date | null;
  end: Date | null;
  /** QA BUG-6: end is null while awaiting the second tap. */
  onChange: (s: Date, e: Date | null) => void;
  month: Date;
  setMonth: (d: Date) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  function tap(d: Date) {
    if (isBefore(d, today)) return;
    // QA BUG-6: the first tap used to set start = end = d, so the "awaiting
    // the end date" state never existed and every tap moved a single day.
    // Now: tap 1 sets the start (end pending), tap 2 completes the range;
    // tapping before the start restarts the selection.
    if (!start || end) {
      onChange(d, null);
    } else if (isBefore(d, start)) {
      onChange(d, null);
    } else {
      onChange(start, d);
    }
  }

  return (
    <div className="rounded-2xl bg-secondary/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <span className="text-sm font-bold">{dfFormat(month, "MMMM yyyy")}</span>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const isStart = start && isSameDay(d, start);
          const isEnd = end && isSameDay(d, end);
          const inRange = start && end && d > start && d < end;
          const disabled = isBefore(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => tap(d)}
              className={`h-9 rounded-lg text-[13px] font-semibold transition-colors ${
                isStart || isEnd
                  ? "bg-primary text-primary-foreground"
                  : inRange
                    ? "bg-primary/15 text-foreground"
                    : disabled
                      ? "text-muted-foreground/30"
                      : inMonth
                        ? "text-foreground hover:bg-secondary"
                        : "text-muted-foreground/50"
              }`}
            >
              {dfFormat(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 2 — Crew ─────────────────────────────────────────────────────── */
function Step2({
  t,
  crew,
  crewInput,
  setCrewInput,
  addCrew,
  removeCrew,
}: {
  t: (k: string, p?: Record<string, string | number>) => string;
  crew: string[];
  crewInput: string;
  setCrewInput: (v: string) => void;
  addCrew: () => void;
  removeCrew: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="type-h1">{t("create.crewTitle")}</h2>
      <div className="flex gap-2">
        <input
          value={crewInput}
          onChange={(e) => setCrewInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCrew();
            }
          }}
          placeholder={t("create.crewPlaceholder")}
          className="flex-1 h-12 rounded-xl bg-secondary px-4 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={addCrew}
          aria-label={t("create.addAnother")}
          className="w-12 h-12 shrink-0 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {crew.length > 0 && (
        <ul className="space-y-2">
          {crew.map((c) => (
            <li
              key={c}
              className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2.5"
            >
              <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {c.charAt(0)}
              </span>
              <span className="flex-1 min-w-0 text-sm truncate">{c}</span>
              <button
                type="button"
                onClick={() => removeCrew(c)}
                aria-label={t("common.remove")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t("create.crewHint")}</p>
    </div>
  );
}

/* ── Step 3 — Budget ───────────────────────────────────────────────────── */
function Step3({
  t,
  amount,
  setAmount,
  currency,
  setCurrency,
  perPerson,
  setPerPerson,
}: {
  t: (k: string, p?: Record<string, string | number>) => string;
  amount: string;
  setAmount: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  perPerson: boolean;
  setPerPerson: (v: boolean) => void;
}) {
  const CURRENCIES = ["USD", "SAR", "AED", "EUR", "GBP", "EGP"];
  return (
    <div className="space-y-5">
      <div>
        <h2 className="type-h1">{t("create.budgetTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("create.budgetSub")}</p>
      </div>
      <div className="flex items-center justify-center gap-2 py-2">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="h-12 rounded-xl bg-secondary px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="0"
          className="w-40 h-16 rounded-xl bg-secondary text-center text-3xl font-extrabold tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="flex rounded-xl bg-secondary p-1">
        <button
          type="button"
          onClick={() => setPerPerson(false)}
          className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${
            !perPerson ? "bg-card text-foreground elev-sm" : "text-muted-foreground"
          }`}
        >
          {t("create.total")}
        </button>
        <button
          type="button"
          onClick={() => setPerPerson(true)}
          className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${
            perPerson ? "bg-card text-foreground elev-sm" : "text-muted-foreground"
          }`}
        >
          {t("create.perPerson")}
        </button>
      </div>
    </div>
  );
}
