"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVertical,
  Plus,
  Minus,
  X,
  Lock,
  BookmarkSimple,
  Train,
  Airplane,
  Car,
  Bus,
  Boat,
  CheckCircle,
  CalendarBlank,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { editShape, reactToBase, type ShapeView, type BaseCard } from "@/lib/actions/shape";

/**
 * «شكل الرحلة» — the trip's structure, and the only screen that edits it.
 *
 * The audit's second pass (docs/planning-city-first.md): people decide where
 * they sleep, for how long, and how they move — in that order — and only
 * decide what happens at 9am on day 17 the night before, or never. Every
 * control here maps to one of those three decisions and nothing here maps to
 * a single day. That is the test this screen has to pass.
 *
 * Nights in, dates out: the stepper says «٦ ليالٍ» because that is how people
 * talk, and it writes a check-in/check-out pair, because that is what a hotel
 * booking is and what makes the arithmetic close.
 */

const MODE_ICON = { train: Train, flight: Airplane, car: Car, bus: Bus, ferry: Boat } as const;
const MODES = ["train", "flight", "car", "bus", "ferry"] as const;

export function ShapeScreen({ tripId, initial }: { tripId: string; initial: ShapeView }) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [busy, startTransition] = useTransition();
  const [order, setOrder] = useState<string[] | null>(null);
  const [cityInput, setCityInput] = useState("");
  const [gwOpen, setGwOpen] = useState<"arrive" | "depart" | null>(null);

  // Keep local state in sync with server revalidations. Every edit calls a
  // server action and then router.refresh(), which re-renders this component
  // with a fresh `initial` — but useState ignores prop changes, so without
  // this the shape saved correctly and the screen silently kept showing the
  // old nights. React's "adjust state when a prop changes" pattern: runs in
  // render (a new server payload is a new object), no effect needed.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setView(initial);
    setOrder(null);
  }

  const bases = order
    ? order.map((id) => view.bases.find((b) => b.id === id)!).filter(Boolean)
    : view.bases;

  const assigned = bases.reduce((n, b) => n + b.nights, 0);
  const unassigned = view.tripNights - assigned;

  // The proven Android pattern (ai-planner-panel, two rounds of video QA):
  // a 180ms hold with 12px tolerance, because a thumb wobbles during the
  // hold and a tighter tolerance silently cancelled the gesture into a
  // scroll. The grip below opts out of the delay entirely.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 12 } }),
  );

  function run(fn: () => Promise<unknown>, optimistic?: () => void) {
    const snapshot = view;
    optimistic?.();
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setView(snapshot);
        setOrder(null);
        toast.error(err instanceof Error ? err.message : t("shape.failed"));
        // Re-read the server rather than trusting the snapshot. On a group
        // trip the failure is often "somebody else just changed this", and
        // reverting to what we had leaves the screen asserting a state that
        // is no longer true — with an error message describing neither.
        router.refresh();
      }
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = bases.map((b) => b.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrder(next);
    run(() => editShape(tripId, { op: "reorder", order: next }));
  }

  const canEdit = view.isOwner;
  /**
   * A one-base trip is the common case (Istanbul, Tbilisi, Dubai, a resort),
   * and this screen was built for a chain. User testing: "one card, with a
   * drag handle to reorder — reorder what, against what? — an ✕ to remove
   * the only city, a stepper with nowhere for a night to go, and an Add-a-
   * base button whose answer is already printed underneath."
   *
   * So the chain controls only appear when there is a chain. What stays is
   * the thing that turned out to be the best content in the app and was
   * buried at the bottom of this card: day trips.
   */
  const single = bases.length === 1;
  const fullyCovers = assigned >= view.tripNights;

  return (
    <div className="pb-32">
      {/* ── ledger: the honesty device, always visible ─────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CalendarBlank size={17} className="text-muted-foreground shrink-0" />
            <span className="text-[13px] font-semibold flex-1 min-w-0 truncate" dir="ltr">
              {fmtRange(view.tripStart, view.tripEnd, locale)}
            </span>
            <span
              className={`text-[12px] font-bold shrink-0 ${
                unassigned === 0 && view.emptyDays === 0
                  ? "text-[color:var(--clr-moss)]"
                  : "text-[color:var(--clr-dune)]"
              }`}
            >
              {/* Math.abs() made over-allocation read as under-allocation in
                  the same words — "4 days with no base" on a trip whose
                  shape ran four days PAST its end. */}
              {unassigned === 0
                ? view.emptyDays > 0
                  ? t("shape.emptyDays", { count: view.emptyDays })
                  : t("shape.covered")
                : unassigned > 0
                  ? t("shape.unassigned", { count: unassigned })
                  : t("shape.overAssigned", { count: -unassigned })}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{
                width: `${Math.min(100, (assigned / Math.max(1, view.tripNights)) * 100)}%`,
                background: unassigned < 0 ? "var(--clr-dune)" : "var(--primary)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── where the trip enters ───────────────────────────────────── */}
      <GatewayRow
        end="arrive"
        view={view}
        bases={bases}
        ar={ar}
        t={t}
        canEdit={canEdit}
        busy={busy}
        open={gwOpen === "arrive"}
        onToggle={() => setGwOpen((v) => (v === "arrive" ? null : "arrive"))}
        onSet={(baseId) =>
          run(async () => {
            await editShape(tripId, { op: "gateway", end: "arrive", baseId });
            setGwOpen(null);
          })
        }
        onAlign={() =>
          run(async () => {
            await editShape(tripId, { op: "alignGateways" });
            toast.success(t("shape.gatewayReversed"));
          })
        }
      />

      {/* ── the bases ───────────────────────────────────────────────── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={bases.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="px-4 space-y-1">
            {bases.map((b, i) => (
              <BaseRow
                key={b.id}
                base={b}
                first={i === 0}
                single={single}
                fullyCovers={fullyCovers}
                canEdit={canEdit}
                busy={busy}
                ar={ar}
                t={t}
                isGroup={view.memberCount > 1}
                onNights={(n) =>
                  run(async () => {
                    const r = await editShape(tripId, { op: "nights", baseId: b.id, nights: n });
                    if (r.noop) {
                      toast.info(t("shape.nowhereToGo"));
                      return;
                    }
                    for (const x of r.movedTo ?? []) {
                      toast.info(t("shape.gaveTo", { place: ar ? x.nameAr : x.name, count: x.nights }));
                    }
                    for (const x of r.takenFrom ?? []) {
                      toast.info(t("shape.tookFrom", { place: ar ? x.nameAr : x.name, count: x.nights }));
                    }
                  })
                }
                onRemove={() =>
                  run(async () => {
                    const r = await editShape(tripId, { op: "remove", baseId: b.id });
                    for (const x of r.movedTo ?? []) {
                      toast.info(t("shape.gaveTo", { place: ar ? x.nameAr : x.name, count: x.nights }));
                    }
                  })
                }
                onMode={(m) => run(() => editShape(tripId, { op: "transport", baseId: b.id, mode: m }))}
                onDayTrip={(id, on) => run(() => editShape(tripId, { op: "dayTrip", baseId: b.id, tripId: id, on }))}
                onLock={(l) => run(() => editShape(tripId, { op: "lock", baseId: b.id, lock: l }))}
                onReact={(r) => run(() => reactToBase(tripId, b.id, r))}
                tripId={tripId}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* ── and where it leaves ─────────────────────────────────────── */}
      <GatewayRow
        end="depart"
        view={view}
        bases={bases}
        ar={ar}
        t={t}
        canEdit={canEdit}
        busy={busy}
        open={gwOpen === "depart"}
        onToggle={() => setGwOpen((v) => (v === "depart" ? null : "depart"))}
        onSet={(baseId) =>
          run(async () => {
            await editShape(tripId, { op: "gateway", end: "depart", baseId });
            setGwOpen(null);
          })
        }
        onAlign={() =>
          run(async () => {
            await editShape(tripId, { op: "alignGateways" });
            toast.success(t("shape.gatewayReversed"));
          })
        }
      />

      {/* ── add a base ──────────────────────────────────────────────── */}
      {canEdit && (
        <div className="px-4 mt-4">
          <p className="text-[12px] text-muted-foreground mb-2">{t("shape.addBase")}</p>

          {/* Any city, not just the ones we curate. Suggestions are a
              shortcut, not the whole set — a trip to somewhere we have no
              route for had nothing to offer and no way to type your own. */}
          <form
            className="flex gap-2 mb-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = cityInput.trim();
              if (name.length < 2) return;
              setCityInput("");
              run(async () => {
                const r = await editShape(tripId, { op: "addCustom", name });
                for (const x of r.borrowedFrom ?? []) {
                  toast.info(t("shape.borrowed", { place: ar ? x.nameAr : x.name, count: x.nights }));
                }
              });
            }}
          >
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder={t("shape.addAnyCity")}
              className="flex-1 min-w-0 h-11 rounded-xl border border-border bg-card px-3.5 text-[13.5px]"
            />
            <button
              type="submit"
              disabled={busy || cityInput.trim().length < 2}
              className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-[13px] disabled:opacity-40"
            >
              {t("shape.addIt")}
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {view.addable.length === 0 && (
              <span className="text-[12px] text-muted-foreground italic">
                {/* "No suggestions for this destination" is wrong when the
                    real reason is that you're already in all of them. */}
                {bases.some((b) => !b.id.startsWith("custom:"))
                  ? t("shape.noMoreBases")
                  : t("shape.noSuggestions")}
              </span>
            )}
            {view.addable.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r = await editShape(tripId, { op: "add", baseId: a.id });
                    // Never move someone's nights in silence.
                    for (const b of r.borrowedFrom ?? []) {
                      toast.info(t("shape.borrowed", { place: ar ? b.nameAr : b.name, count: b.nights }));
                    }
                  })
                }
                className="min-h-11 px-3.5 rounded-full border border-dashed border-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus size={14} /> {ar ? a.nameAr : a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── what the shape says you still have to book ──────────────── */}
      <div className="px-4 mt-5">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <p className="px-4 py-2.5 text-[13px] font-bold border-b border-border">{t("shape.errands")}</p>
          <ul className="px-4 py-3 space-y-2">
            {view.errands.filter((e) => !e.done).length === 0 ? (
              <li className="text-[13px] text-muted-foreground">{t("shape.allBooked")}</li>
            ) : (
              view.errands
                .filter((e) => !e.done)
                .slice(0, 8)
                .map((e, i) => (
                  <li key={`${e.kind}-${e.baseId}-${i}`} className="flex items-center gap-2.5 text-[13px]">
                    <span className="w-3.5 h-3.5 rounded border-[1.5px] border-muted-foreground shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {e.kind === "stay"
                        ? t("shape.errandStay", {
                            place: ar ? e.nameAr : e.name,
                            nights: t("shape.nights", { count: e.nights ?? 0 }),
                          })
                        : e.kind === "roundtrip" || e.kind === "flightIn" || e.kind === "flightOut"
                          ? // The two biggest tickets on the trip, and this
                            // list never mentioned them until now.
                            t(`shape.errand${e.kind[0].toUpperCase()}${e.kind.slice(1)}`, {
                              city: ar ? e.nameAr : e.name,
                            })
                          : t("shape.errandTransport", {
                              mode: t(`shape.mode_${e.mode}`),
                              place: ar ? e.nameAr : e.name,
                            })}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </div>
      </div>

      {/* ── the days this shape projects ────────────────────────────── */}
      <div className="px-4 mt-5">
        <Link
          href={`/trips/${tripId}/itinerary`}
          className="w-full min-h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] inline-flex items-center justify-center gap-2 px-4"
        >
          {t("shape.viewDays")}
          <span className="opacity-80 text-[13px] font-semibold">
            {/* "26 days ready" with ten of them empty is not ready. */}
            {/* "0 days ready" on a destination we don't curate is a strange
                way to say "nothing is planned yet, go fill it". */}
            · {view.days.length > 0 && view.emptyDays >= view.days.length
              ? t("shape.daysAllEmpty", { count: view.days.length })
              : view.emptyDays > 0
                ? t("shape.daysSomeEmpty", { count: view.emptyDays })
                : t("shape.daysProjected", { count: view.days.length })}
          </span>
          <CaretRight size={16} className="rtl:rotate-180" />
        </Link>
        {!canEdit && (
          <p className="mt-2.5 text-center text-[12px] text-muted-foreground">{t("shape.onlyOwner")}</p>
        )}
      </div>
    </div>
  );
}

function BaseRow({
  base, first, single, fullyCovers, canEdit, busy, ar, t, isGroup, tripId,
  onNights, onRemove, onMode, onDayTrip, onLock, onReact,
}: {
  base: BaseCard;
  first: boolean;
  single: boolean;
  /** this one base already covers the whole trip, so nights can't move */
  fullyCovers: boolean;
  tripId: string;
  canEdit: boolean;
  busy: boolean;
  ar: boolean;
  t: (k: string, v?: Record<string, string | number>) => string;
  isGroup: boolean;
  onNights: (n: number) => void;
  onRemove: () => void;
  onMode: (m: (typeof MODES)[number]) => void;
  onDayTrip: (id: string, on: boolean) => void;
  onLock: (l: "hotel" | null) => void;
  onReact: (r: "love" | "ok" | "skip") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: base.id });
  const [modeOpen, setModeOpen] = useState(false);
  const locked = !!base.lockedBy;
  const atMax = base.nights >= base.maxNights;
  const Mode = base.transportInMode ? MODE_ICON[base.transportInMode] : Train;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-manipulation select-none ${isDragging ? "opacity-80 z-10 relative" : ""}`}
    >
      {/* the leg you arrived on — an assertion, with two consequences */}
      {!first && (
        <div className="flex items-center gap-2 ps-8 py-1.5 flex-wrap">
          <button
            type="button"
            disabled={!canEdit || busy}
            onClick={() => setModeOpen((v) => !v)}
            style={{ touchAction: "none" }}
            className="min-h-9 px-3 rounded-full border border-border bg-card inline-flex items-center gap-1.5 text-[12px] font-semibold text-[color:var(--clr-horizon)]"
            aria-label={t("shape.changeTransport")}
          >
            <Mode size={14} weight="fill" />
            {t(`shape.mode_${base.transportInMode ?? "train"}`)}
            {base.transportInMinutes != null && (
              <span className="text-muted-foreground font-medium">
                {fmtMins(base.transportInMinutes, t)}
              </span>
            )}
          </button>
          {(base.transportInMinutes ?? 0) >= 180 && (
            <span className="text-[11px] text-[color:var(--clr-dune)]">{t("shape.shortArrival")}</span>
          )}
          {modeOpen && canEdit && (
            <div className="flex gap-1.5 flex-wrap">
              {MODES.filter((m) => m !== base.transportInMode).map((m) => {
                const I = MODE_ICON[m];
                return (
                  <button
                    key={m}
                    type="button"
                    style={{ touchAction: "none" }}
                    onClick={() => { setModeOpen(false); onMode(m); }}
                    className="min-h-9 px-3 rounded-full border border-border bg-muted/40 text-[12px] inline-flex items-center gap-1.5"
                  >
                    <I size={13} /> {t(`shape.mode_${m}`)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-3 flex items-start gap-2">
        {/* Instant-drag grip: touch-action none hands the gesture to dnd-kit
            from the first pixel, so it feels grabbable — the card body keeps
            hold-to-drag. Both fixes come from Android video QA. */}
        {!single && (
          <span
            {...listeners}
            style={{ touchAction: "none" }}
            className="shrink-0 -ms-1 p-2.5 text-muted-foreground cursor-grab active:cursor-grabbing"
            aria-label={t("shape.reorder")}
          >
            <DotsSixVertical size={20} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* The city layer: what you actually do while based here. */}
            <Link
              href={`/trips/${tripId}/city/${base.id}`}
              className="font-extrabold text-[16px] underline decoration-dotted underline-offset-4 decoration-muted-foreground/50"
            >
              {ar ? base.nameAr : base.name}
            </Link>
            {locked && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                <Lock size={11} weight="fill" />
                {base.lockedBy === "hotel" ? t("shape.lockedHotel") : t("shape.lockedFlight")}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5" dir="ltr">
            {fmtDate(base.checkIn, ar)} – {fmtDate(base.checkOut, ar)}
          </p>

          {base.savesHere > 0 && (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
              <BookmarkSimple size={11} weight="fill" />
              {t("shape.savesHere", { count: base.savesHere })}
            </span>
          )}

          {/* the trade-off, made directly */}
          {/* Hidden only when a single base already owns the whole trip.
              A tester removed bases until one was left and the stepper row
              collapsed to nothing — no count, no controls — while the
              header read "21 days with no base". */}
          <div className={`mt-2 items-center gap-1.5 flex-wrap ${single && fullyCovers ? "hidden" : "flex"}`}>
            {/* A stepper that silently does nothing is worse than one that
                refuses out loud: a tester tapped minus on three cities in a
                row, got no movement and no message, and concluded the screen
                was frozen. The "+" had only a hover tooltip, which a phone
                never shows. */}
            <button
              type="button"
              style={{ touchAction: "none" }}
              disabled={!canEdit || busy}
              onClick={() => {
                if (locked) return toast.info(t("shape.lockedReason"));
                if (base.nights <= 1) return toast.info(t("shape.atMinimum", { place: ar ? base.nameAr : base.name }));
                onNights(base.nights - 1);
              }}
              aria-label="−"
              className={`w-11 h-11 rounded-xl border border-border inline-flex items-center justify-center ${locked || base.nights <= 1 ? "opacity-40" : ""}`}
            >
              <Minus size={16} />
            </button>
            <span className="min-w-[86px] text-center text-[13px] font-bold">
              {t("shape.nights", { count: base.nights })}
            </span>
            <button
              type="button"
              style={{ touchAction: "none" }}
              disabled={!canEdit || busy}
              onClick={() => {
                if (locked) return toast.info(t("shape.lockedReason"));
                // Past the curated depth is allowed — say what it costs and
                // then do it. A dimmed button with two grey words under it
                // is not an argument.
                if (atMax) toast.info(t("shape.pastCurated", { place: ar ? base.nameAr : base.name }));
                onNights(base.nights + 1);
              }}
              aria-label="+"
              className={`w-11 h-11 rounded-xl border border-border inline-flex items-center justify-center ${locked ? "opacity-40" : ""}`}
            >
              <Plus size={16} />
            </button>
            {atMax && !locked && (
              <span className="text-[10.5px] text-muted-foreground">{t("shape.freeBeyond")}</span>
            )}
          </div>

          {/* day trips hang off the base — they are not nodes in the chain */}
          {(base.dayTrips.length > 0 || base.reachable.length > 0) && (
            <div className={`mt-2.5 pt-2.5 border-t border-dashed border-border flex items-center gap-1.5 flex-wrap ${single ? "border-t-0 pt-0" : ""}`}>
              <span className={`text-muted-foreground ${single ? "text-[12px] font-semibold w-full mb-0.5" : "text-[10.5px]"}`}>
                {single ? t("shape.dayTripsLead") : t("shape.dayTrips")}
              </span>
              {base.dayTrips.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1 text-[12px] rounded-full border border-border bg-muted/40 ps-3 pe-1 min-h-9"
                >
                  {ar ? d.nameAr : d.name}
                  {canEdit && (
                    <button
                      type="button"
                      style={{ touchAction: "none" }}
                      onClick={() => onDayTrip(d.id, false)}
                      aria-label={t("shape.removeDayTrip", { place: ar ? d.nameAr : d.name })}
                      className="w-9 h-9 -me-1.5 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-[color:var(--clr-horizon)]"
                    >
                      <X size={13} />
                    </button>
                  )}
                </span>
              ))}
              {canEdit &&
                base.reachable.slice(0, single ? 4 : 2).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    style={{ touchAction: "none" }}
                    disabled={busy}
                    onClick={() => onDayTrip(r.id, true)}
                    className="min-h-9 px-3 rounded-full border border-dashed border-border text-[12px] text-muted-foreground inline-flex items-center gap-1.5 hover:border-primary/50 hover:text-primary"
                  >
                    <Plus size={13} /> {ar ? r.nameAr : r.name}
                  </button>
                ))}
            </div>
          )}

          {/* the crew reacts HERE — this is the layer they argue about */}
          {isGroup && (
            <div className="mt-2.5 flex items-center gap-1.5">
              {(["love", "ok", "skip"] as const).map((r) => {
                const n = base.reactions[r];
                const mine = base.reactions.mine === r;
                return (
                  <button
                    key={r}
                    type="button"
                    style={{ touchAction: "none" }}
                    disabled={busy}
                    onClick={() => onReact(r)}
                    className={`min-h-9 px-3 rounded-full border text-[12px] font-semibold inline-flex items-center gap-1.5 ${
                      mine ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {r === "love" ? "🔥" : r === "ok" ? "🙂" : "⤫"}
                    {n > 0 && <span dir="ltr">{n}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          {canEdit && (
            <button
              type="button"
              style={{ touchAction: "none" }}
              disabled={busy}
              onClick={() => onLock(locked ? null : "hotel")}
              aria-label={t("shape.markBooked")}
              className={`w-11 h-11 rounded-xl inline-flex items-center justify-center ${
                locked ? "text-[color:var(--clr-moss)] bg-[color:var(--clr-moss)]/10" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <CheckCircle size={17} weight={locked ? "fill" : "regular"} />
            </button>
          )}
          {canEdit && !single && (
            <button
              type="button"
              style={{ touchAction: "none" }}
              disabled={busy || locked}
              onClick={onRemove}
              aria-label={t("shape.remove")}
              className="w-11 h-11 rounded-xl text-muted-foreground hover:text-[color:var(--clr-horizon)] hover:bg-[color:var(--clr-horizon)]/10 inline-flex items-center justify-center disabled:opacity-30"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Durations read inside Arabic sentences, so the units are translated too. */
function fmtMins(m: number, t: (k: string, v?: Record<string, string | number>) => string) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return t("shape.durHM", { h, m: r });
  if (h) return t("shape.durH", { h });
  return t("shape.durM", { m: r });
}
function fmtDate(iso: string, ar: boolean) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(ar ? "ar" : "en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
/**
 * "You land in Lisbon" / "You fly home from Porto".
 *
 * Nothing is asked up front: both ends default to the shape's own first and
 * last base, so a round trip — most trips — reads as a statement and needs
 * no answer. It only becomes a question when you make it one.
 *
 * When the stored end and the shape disagree, the row says so and offers
 * BOTH repairs rather than picking one. Silently rewriting the shape to
 * match a flight, or the flight to match a shape, is the class of bug that
 * left nine rows stranded in the database when the trip's dates moved.
 */
function GatewayRow({
  end,
  view,
  bases,
  ar,
  t,
  canEdit,
  busy,
  open,
  onToggle,
  onSet,
  onAlign,
}: {
  end: "arrive" | "depart";
  view: ShapeView;
  bases: BaseCard[];
  ar: boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
  canEdit: boolean;
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onSet: (baseId: string | null) => void;
  onAlign: () => void;
}) {
  const g = view.gateways;
  const isArrive = end === "arrive";
  const city = isArrive ? (ar ? g.arriveNameAr : g.arriveName) : ar ? g.departNameAr : g.departName;
  const mismatch = isArrive ? g.arriveMismatch : g.departMismatch;
  const missing = isArrive ? g.arriveMissing : g.departMissing;
  const shapeEnd = isArrive ? bases[0] : bases[bases.length - 1];
  const shapeCity = shapeEnd ? (ar ? shapeEnd.nameAr : shapeEnd.name) : "";

  if (!city && !missing) return null;

  return (
    <div className="px-4 py-1">
      <div
        className={`rounded-2xl border bg-card ${
          mismatch || missing ? "border-[color:var(--clr-dune)]" : "border-border"
        }`}
      >
        <button
          type="button"
          onClick={canEdit ? onToggle : undefined}
          disabled={!canEdit || busy}
          className="w-full min-h-12 px-3.5 py-2 flex items-center gap-2.5 text-start"
        >
          <Airplane
            size={16}
            className="text-muted-foreground shrink-0"
            // An arrival and a departure are the same icon pointing two
            // ways round; one icon for both reads as a duplicated row.
            style={{ transform: isArrive ? "rotate(45deg)" : "rotate(-45deg)" }}
          />
          <span className="text-[12.5px] text-muted-foreground shrink-0">
            {t(isArrive ? "shape.gatewayArrive" : "shape.gatewayDepart")}
          </span>
          {/* The city name wins every fight on this row.
              An "open jaw — two separate tickets" pill used to sit here and
              ate the whole line: Samarkand rendered as "…nd", Sapporo as
              three letters. On the one screen whose entire job is naming
              two cities, the name was the only thing never legible — and
              the pill was redundant anyway, since the two rows already say
              different cities. It lives in the picker below now, where
              there is room for it. */}
          <span className="text-[13.5px] font-bold min-w-0 flex-1 truncate">{city}</span>
          {canEdit && <CaretRight size={14} className="text-muted-foreground shrink-0 rtl:rotate-180" />}
        </button>

        {(mismatch || missing) && (
          <div className="px-3.5 pb-3 pt-0.5 space-y-2">
            <p className="text-[12px] text-[color:var(--clr-dune)] leading-snug">
              {missing
                ? t(isArrive ? "shape.gatewayMissingArrive" : "shape.gatewayMissingDepart", {
                    gateway: city,
                  })
                : t(isArrive ? "shape.gatewayMismatchArrive" : "shape.gatewayMismatchDepart", {
                    city: shapeCity,
                    gateway: city,
                  })}
            </p>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {/* Only offered when reversing actually reaches both ends —
                    a button that throws when pressed is worse than none. */}
                {g.canAlign && !missing && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onAlign}
                    className="min-h-11 px-3.5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-bold"
                  >
                    {t("shape.gatewayAlign")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSet(null)}
                  className="min-h-11 px-3.5 rounded-xl border border-border text-[12.5px] font-semibold"
                >
                  {t("shape.gatewayUseShape", { city: shapeCity })}
                </button>
              </div>
            )}
          </div>
        )}

        {open && canEdit && (
          <div className="px-3.5 pb-3 pt-0.5">
            <p className="text-[11.5px] text-muted-foreground mb-2">{t("shape.gatewayPick")}</p>
            <div className="flex flex-wrap gap-2">
              {bases.map((b) => {
                const active = (isArrive ? g.arrive : g.depart) === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onSet(b.id)}
                    className={`min-h-11 px-3.5 rounded-full border text-[13px] font-semibold ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {ar ? b.nameAr : b.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {g.openJaw ? t("shape.gatewayOpenJaw") : t("shape.gatewaySameCity")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtRange(a: string, b: string, locale: string) {
  const f = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  return `${f(a)} – ${f(b)}`;
}
