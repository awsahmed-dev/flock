"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle as Sparkles,
  CircleNotch as Loader2,
  MapPin,
  Clock,
  ForkKnife as Utensils,
  Ticket,
  Plus,
  CheckSquareOffset as Vote,
  CheckSquare,
  Square,
  Star,
  ArrowSquareOut,
  Minus,
  X,
  AirplaneTilt,
  Train,
  Bus,
  Car,
  Boat,
  PersonSimpleWalk,
  ArrowsClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { toast } from "sonner";
import { addPlannedItems, voteOnPlannedItems, type PlannedActivity } from "@/lib/actions/ai-planner";
import { useT } from "@/components/i18n/locale-provider";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, Check, CaretLeft, CaretRight, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { getDayColor } from "@/lib/day-colors";

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  destination: string;
}

/* — API shapes (mirror /api/ai/plan) — */
interface RouteLeg {
  city: string;
  cityLabel: string;
  nights: number;
  why: string;
  travel: { mode: TravelMode; note: string } | null;
  photoUrl: string | null;
}
type TravelMode = "flight" | "train" | "bus" | "car" | "ferry" | "walk";

interface PlannedPlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  photoUrl: string | null;
  address: string | null;
  category: string | null;
  placeTypes: string[];
  mapsUrl: string;
}
interface AssembledItem {
  day: number;
  type: "activity" | "meal" | "transport" | "accommodation";
  startTime: string | null;
  note: string;
  place: PlannedPlace;
  alt: PlannedPlace | null;
}
/** AssembledItem with a stable client id — selection and drag survive reorders. */
interface UItem extends AssembledItem {
  uid: string;
}
interface LegState {
  status: "pending" | "loading" | "done" | "error";
  summary?: string;
  items: UItem[];
  error?: string;
}

const TRAVEL_STYLES = [
  { value: "adventure", labelKey: "aiPlan.vibeAdventure", descKey: "aiPlan.vibeAdventureDesc" },
  { value: "relaxed", labelKey: "aiPlan.vibeRelaxed", descKey: "aiPlan.vibeRelaxedDesc" },
  { value: "cultural", labelKey: "aiPlan.vibeCultural", descKey: "aiPlan.vibeCulturalDesc" },
  { value: "foodie", labelKey: "aiPlan.vibeFoodie", descKey: "aiPlan.vibeFoodieDesc" },
  { value: "budget", labelKey: "aiPlan.vibeBudget", descKey: "aiPlan.vibeBudgetDesc" },
  { value: "luxury", labelKey: "aiPlan.vibeLuxury", descKey: "aiPlan.vibeLuxuryDesc" },
] as const;
type TravelStyle = (typeof TRAVEL_STYLES)[number]["value"];

const PACES = [
  { value: "chill", labelKey: "aiPlan.paceChill", descKey: "aiPlan.paceChillDesc" },
  { value: "balanced", labelKey: "aiPlan.paceBalanced", descKey: "aiPlan.paceBalancedDesc" },
  { value: "packed", labelKey: "aiPlan.pacePacked", descKey: "aiPlan.pacePackedDesc" },
] as const;

const BUDGETS = [
  { value: "shoestring", labelKey: "aiPlan.budgetShoestring", descKey: "aiPlan.budgetShoestringDesc" },
  { value: "mid", labelKey: "aiPlan.budgetMid", descKey: "aiPlan.budgetMidDesc" },
  { value: "splurge", labelKey: "aiPlan.budgetSplurge", descKey: "aiPlan.budgetSplurgeDesc" },
] as const;

const DIETARY = ["halal", "vegetarian", "vegan", "gluten-free"] as const;

const TRAVEL_ICON: Record<TravelMode, React.ReactNode> = {
  flight: <AirplaneTilt className="w-4 h-4" />,
  train: <Train className="w-4 h-4" />,
  bus: <Bus className="w-4 h-4" />,
  car: <Car className="w-4 h-4" />,
  ferry: <Boat className="w-4 h-4" />,
  walk: <PersonSimpleWalk className="w-4 h-4" />,
};
const TRAVEL_MODES = Object.keys(TRAVEL_ICON) as TravelMode[];

function priceGlyphs(level: number | null): string {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(level, 4));
}

/** Chip drops aim with the POINTER (rows are panel-wide, so their rect
 *  center sits far from the grab point); row-over-row sorting keeps
 *  closestCenter. Without this, dropping "on D3" could land on the chip
 *  nearest the row's center instead. */
const placeCollision: CollisionDetection = (args) => {
  const chipHit = pointerWithin(args).find((c) => String(c.id).startsWith("daychip-"));
  if (chipHit) return [chipHit];
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith("daychip-")),
  });
};

/** AssembledItem → the server-action shape, carrying the grounded place. */
function toPlanned(it: AssembledItem, dayOffsetMap: Map<number, number>): PlannedActivity {
  return {
    day: dayOffsetMap.get(it.day) ?? it.day,
    title: it.place.name,
    type: it.type,
    startTime: it.startTime ?? undefined,
    locationName: it.place.address ?? it.place.name,
    notes: it.note || undefined,
    place: {
      placeId: it.place.placeId,
      lat: it.place.lat,
      lng: it.place.lng,
      photoUrl: it.place.photoUrl,
      rating: it.place.rating,
      userRatingsTotal: it.place.userRatingsTotal,
      priceLevel: it.place.priceLevel,
      placeTypes: it.place.placeTypes,
      address: it.place.address,
      mapsUrl: it.place.mapsUrl,
    },
  };
}

/** One draggable route-leg card: city photo banner + wow line + controls. */
function SortableLeg({
  id,
  leg,
  index,
  legsCount,
  t,
  onBump,
  onRemove,
  onTravelMode,
}: {
  id: string;
  leg: RouteLeg;
  index: number;
  legsCount: number;
  t: (k: string, v?: Record<string, string | number>) => string;
  onBump: (idx: number, delta: number) => void;
  onRemove: (idx: number) => void;
  onTravelMode: (idx: number, mode: TravelMode) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    // The WHOLE card is the drag surface (long-press on touch, small
    // move on pointer) — a finger-sized target instead of a 18px handle.
    // Quick taps still reach the buttons because activation needs a
    // hold/move first. touch-manipulation keeps normal page scroll.
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-manipulation ${isDragging ? "opacity-80 z-10 relative" : ""}`}
    >
      {/* travel hop chip */}
      {index > 0 && (
        <div className="flex items-center gap-2 ps-4 pb-2">
          <select
            value={leg.travel?.mode ?? "car"}
            onChange={(e) => onTravelMode(index, e.target.value as TravelMode)}
            className="text-sm font-semibold"
            aria-label={t("aiPlan.travelMode")}
          >
            {TRAVEL_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`aiPlan.travel_${m}`)}
              </option>
            ))}
          </select>
          {leg.travel?.note ? (
            <span className="text-[12px] text-muted-foreground truncate">{leg.travel.note}</span>
          ) : null}
        </div>
      )}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        {leg.photoUrl && (
          <div className="relative h-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={leg.photoUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <p className="absolute bottom-2 start-3 text-white font-bold text-sm drop-shadow">{leg.cityLabel}</p>
          </div>
        )}
        <div className="p-3.5">
          <div className="flex items-start gap-2.5">
            <span
              className="shrink-0 -ms-1 p-1.5 text-muted-foreground cursor-grab active:cursor-grabbing"
              aria-hidden
            >
              <DotsSixVertical className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              {!leg.photoUrl && <p className="text-sm font-bold truncate">{leg.cityLabel}</p>}
              {leg.why ? (
                <p className="text-xs text-muted-foreground line-clamp-2">{leg.why}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onBump(index, -1)}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                aria-label="-1"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold tabular-nums min-w-[4ch] text-center">
                {t("aiPlan.nights", { count: leg.nights })}
              </span>
              <button
                type="button"
                onClick={() => onBump(index, 1)}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted"
                aria-label="+1"
              >
                <Plus className="w-4 h-4" />
              </button>
              {legsCount > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
                  aria-label={t("common.delete")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Step-4 city tab: click to jump, drag sideways to reorder the whole leg. */
function SortableCityTab({
  id,
  label,
  daysLabel,
  active,
  status,
  onSelect,
}: {
  id: string;
  label: string;
  daysLabel: string;
  active: boolean;
  status: LegState["status"];
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-manipulation flex-1 min-w-0 rounded-xl border px-2 py-1.5 text-center transition-colors ${
        isDragging ? "opacity-80 z-10 relative" : ""
      } ${
        active
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40"
      }`}
    >
      <span className="block text-xs font-bold truncate">{label}</span>
      <span className={`block text-[10px] font-semibold ${active ? "text-primary/75" : "text-muted-foreground/70"}`}>
        {status === "error" ? "!" : daysLabel}
        {(status === "loading" || status === "pending") && (
          <Loader2 className="inline w-2.5 h-2.5 ms-1 animate-spin align-[-1px]" />
        )}
      </span>
    </button>
  );
}

/** Day chip in the rail: click to view, and a drop target for place rows. */
function DayRailChip({
  day,
  active,
  disabled,
  selCount,
  total,
  onSelect,
}: {
  day: number;
  active: boolean;
  disabled: boolean;
  selCount: number;
  total: number;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `daychip-${day}`, disabled });
  return (
    <button
      type="button"
      ref={(el) => {
        setNodeRef(el);
        if (active && el) el.scrollIntoView({ inline: "center", block: "nearest" });
      }}
      onClick={onSelect}
      disabled={disabled}
      className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-bold transition-colors disabled:opacity-40 ${
        active
          ? "bg-primary border-primary text-primary-foreground"
          : isOver
            ? "border-primary bg-primary/15 text-foreground"
            : "border-border bg-card text-muted-foreground"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: getDayColor(day - 1) }} aria-hidden />
      D{day}
      {total > 0 && (
        <span
          className={`text-[10px] font-extrabold ${
            active ? "text-primary-foreground/60" : selCount === total ? "text-[var(--clr-moss)]" : "text-muted-foreground/70"
          }`}
        >
          {selCount}/{total}
        </span>
      )}
    </button>
  );
}

/** One compact place row: drag to sort (or onto a day chip), tap to expand. */
function SortablePlaceRow({
  item,
  dayColor,
  isSel,
  isOpen,
  busy,
  t,
  onToggleSel,
  onToggleOpen,
  onAddOne,
  onDuel,
}: {
  item: UItem;
  dayColor: string;
  isSel: boolean;
  isOpen: boolean;
  busy: string | null;
  t: (k: string, v?: Record<string, string | number>) => string;
  onToggleSel: () => void;
  onToggleOpen: () => void;
  onAddOne: () => void;
  onDuel: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact" }).format(n);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-2xl border bg-card overflow-hidden touch-manipulation ${
        isDragging ? "opacity-80 z-10 relative shadow-lg" : ""
      } ${isSel ? "border-primary/50" : "border-border"}`}
    >
      {/* the whole row is the drag surface (hold on touch, small move on pointer) */}
      <div {...attributes} {...listeners} className="flex items-center gap-2.5 p-2.5 cursor-pointer" onClick={onToggleOpen}>
        <span className="shrink-0 -ms-0.5 text-muted-foreground/70 cursor-grab active:cursor-grabbing" aria-hidden>
          <DotsSixVertical className="w-4 h-4" />
        </span>
        <div
          className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${dayColor} 16%, var(--muted))` }}
        >
          {item.place.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.place.photoUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : item.type === "meal" ? (
            <Utensils className="w-[18px] h-[18px] text-muted-foreground" />
          ) : (
            <Ticket className="w-[18px] h-[18px] text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug truncate">{item.place.name}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {item.startTime && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-4 h-4" />
                {item.startTime}
              </span>
            )}
            {item.place.rating != null && (
              <span className="inline-flex items-center gap-0.5 font-bold text-foreground/80">
                <Star className="w-4 h-4 text-amber-400" weight="fill" />
                {item.place.rating.toFixed(1)}
                {item.place.userRatingsTotal ? (
                  <span className="font-medium text-muted-foreground">({compact(item.place.userRatingsTotal)})</span>
                ) : null}
              </span>
            )}
            {priceGlyphs(item.place.priceLevel) && (
              <span className="font-bold">{priceGlyphs(item.place.priceLevel)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSel();
          }}
          aria-label={isSel ? t("common.delete") : t("aiPlan.addOne")}
          className={`w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 transition-colors ${
            isSel
              ? "bg-primary text-primary-foreground"
              : "border-2 border-border text-transparent hover:border-primary/50"
          }`}
        >
          <Check className="w-4 h-4" weight="bold" />
        </button>
        <CaretDown
          className={`w-4 h-4 text-muted-foreground/70 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <div className="border-t border-border px-3 py-2.5">
          {item.note ? <p className="text-xs text-muted-foreground leading-relaxed">{item.note}</p> : null}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <a
              href={item.place.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline"
            >
              <ArrowSquareOut className="w-4 h-4" />
              {t("aiPlan.openInGoogle")}
            </a>
            {item.alt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuel();
                }}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/35 bg-primary/[0.04] px-2.5 py-1 text-[12px] text-muted-foreground disabled:opacity-50"
              >
                {busy === `duel-${item.uid}` ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Vote className="w-4 h-4 text-primary shrink-0" />
                )}
                {t("aiPlan.orAlt")} <span className="font-semibold text-foreground">{item.alt.name}</span>
                <span className="font-bold text-primary">{t("aiPlan.askCrew")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddOne();
              }}
              disabled={busy !== null}
              aria-label={t("aiPlan.addOne")}
              className="ms-auto w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:border-primary/50 disabled:opacity-50"
            >
              {busy === `add-${item.uid}` ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiPlannerPanel({ open, onClose, tripId, destination }: Props) {
  const router = useRouter();
  const t = useT();

  // wizard position: 1 vibe · 2 rhythm+constraints · 3 route · 4 journey
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // prefs
  const [travelStyle, setTravelStyle] = useState<TravelStyle>("cultural");
  const [interests, setInterests] = useState("");
  const [pace, setPace] = useState<"chill" | "balanced" | "packed">("balanced");
  const [dailyBudget, setDailyBudget] = useState<"shoestring" | "mid" | "splurge">("mid");
  const [dietary, setDietary] = useState<string[]>([]);
  const [mustSee, setMustSee] = useState("");
  const [avoid, setAvoid] = useState("");
  const [startCity, setStartCity] = useState("");
  const [endCity, setEndCity] = useState("");

  // route
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [numDays, setNumDays] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [newCity, setNewCity] = useState("");

  // journey
  const [legStates, setLegStates] = useState<LegState[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // item uids
  const [busy, setBusy] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1); // absolute trip day in view
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // open rows
  const [, startTransition] = useTransition();

  const prefsBody = {
    tripId,
    travelStyle,
    interests,
    pace,
    dailyBudget,
    dietary,
    mustSee,
    avoid,
    startCity,
    endCity,
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  function onLegDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLegs((prev) => {
      const from = prev.findIndex((_, i) => `leg-${i}` === active.id);
      const to = prev.findIndex((_, i) => `leg-${i}` === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }

  const usedDays = legs.reduce((s, l) => s + l.nights, 0);
  const daysBalanced = numDays > 0 && usedDays === numDays;

  /** day-number map: leg order → consecutive 1-indexed trip days */
  function legDays(legIdx: number): number[] {
    let start = 1;
    for (let i = 0; i < legIdx; i++) start += legs[i].nights;
    return Array.from({ length: legs[legIdx].nights }, (_, i) => start + i);
  }

  /** which leg owns an absolute trip day */
  function dayToLeg(day: number): number {
    let start = 1;
    for (let i = 0; i < legs.length; i++) {
      if (day < start + legs[i].nights) return i;
      start += legs[i].nights;
    }
    return Math.max(0, legs.length - 1);
  }

  /* ── route step ─────────────────────────────────────────────────── */

  async function fetchRoute() {
    setRouteLoading(true);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefsBody, mode: "route" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("aiPlan.legFailedGeneric"));
        return;
      }
      setLegs(data.legs);
      setNumDays(data.numDays);
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiPlan.legFailedGeneric"));
    } finally {
      setRouteLoading(false);
    }
  }

  function bumpNights(idx: number, delta: number) {
    setLegs((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, nights: Math.max(1, l.nights + delta) } : l)),
    );
  }
  function removeLeg(idx: number) {
    setLegs((prev) => prev.filter((_, i) => i !== idx));
  }
  function setTravelModeAt(idx: number, mode: TravelMode) {
    setLegs((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, travel: { mode, note: l.travel?.note ?? "" } } : l,
      ),
    );
  }
  function addCity() {
    const city = newCity.trim();
    if (!city) return;
    setLegs((prev) => [
      ...prev,
      { city, cityLabel: city, nights: 1, why: "", travel: { mode: "car", note: "" }, photoUrl: null },
    ]);
    setNewCity("");
  }

  /* ── journey step: assemble legs sequentially ───────────────────── */

  async function startJourney() {
    if (!daysBalanced) return;
    setStep(4);
    setSelected(new Set());
    setExpanded(new Set());
    setActiveDay(1);
    const states: LegState[] = legs.map(() => ({ status: "pending", items: [] }));
    setLegStates([...states]);

    // places already planned in earlier legs — a Fuji day-trip from Tokyo
    // shouldn't reappear when the Fuji leg itself assembles
    const usedPlaceIds: string[] = [];

    for (let i = 0; i < legs.length; i++) {
      states[i] = { status: "loading", items: [] };
      setLegStates([...states]);
      try {
        const res = await fetch("/api/ai/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...prefsBody,
            mode: "assemble",
            leg: { city: legs[i].city, days: legDays(i) },
            excludePlaceIds: usedPlaceIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("aiPlan.legFailedGeneric"));
        const items: UItem[] = (data.items as AssembledItem[]).map((it, j) => ({ ...it, uid: `${i}-${j}` }));
        states[i] = { status: "done", summary: data.summary, items };
        // pre-select everything from this leg
        setSelected((prev) => {
          const next = new Set(prev);
          items.forEach((it) => next.add(it.uid));
          return next;
        });
        items.forEach((it) => {
          usedPlaceIds.push(it.place.placeId);
          if (it.alt) usedPlaceIds.push(it.alt.placeId);
        });
      } catch (err) {
        states[i] = {
          status: "error",
          items: [],
          error: err instanceof Error ? err.message : t("aiPlan.legFailedGeneric"),
        };
      }
      setLegStates([...states]);
    }
  }

  async function retryLeg(i: number) {
    const states = [...legStates];
    states[i] = { status: "loading", items: [] };
    setLegStates([...states]);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefsBody,
          mode: "assemble",
          leg: { city: legs[i].city, days: legDays(i) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("aiPlan.legFailedGeneric"));
      const items: UItem[] = (data.items as AssembledItem[]).map((it, j) => ({ ...it, uid: `${i}-${j}` }));
      states[i] = { status: "done", summary: data.summary, items };
      setSelected((prev) => {
        const next = new Set(prev);
        items.forEach((it) => next.add(it.uid));
        return next;
      });
    } catch (err) {
      states[i] = {
        status: "error",
        items: [],
        error: err instanceof Error ? err.message : t("aiPlan.legFailedGeneric"),
      };
    }
    setLegStates([...states]);
  }

  /* ── selection + actions ────────────────────────────────────────── */

  const identityDayMap = new Map<number, number>(); // grounded days are already trip days

  const allEntries: { key: string; item: UItem }[] = legStates.flatMap((ls) =>
    ls.items.map((item) => ({ key: item.uid, item })),
  );
  const selectedEntries = allEntries.filter((e) => selected.has(e.key));

  // step-4 pager derivations
  const activeLegIdx = legs.length > 0 ? dayToLeg(activeDay) : 0;
  const activeLegState: LegState | undefined = legStates[activeLegIdx];
  const dayItems = activeLegState?.items.filter((it) => it.day === activeDay) ?? [];
  const allDaysFlat = legs.flatMap((_, i) => legDays(i));
  const dayPos = allDaysFlat.indexOf(activeDay);
  const daySelCount = dayItems.filter((it) => selected.has(it.uid)).length;

  function toggleKey(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleExpanded(uid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  /* ── step-4 drag: sort places, move across days, reorder city tabs ── */

  function findItem(uid: string): { legIdx: number; itemIdx: number; item: UItem } | null {
    for (let i = 0; i < legStates.length; i++) {
      const j = legStates[i].items.findIndex((it) => it.uid === uid);
      if (j >= 0) return { legIdx: i, itemIdx: j, item: legStates[i].items[j] };
    }
    return null;
  }

  function onPlaceDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const uid = String(active.id);
    const overId = String(over.id);
    const src = findItem(uid);
    if (!src) return;

    if (overId.startsWith("daychip-")) {
      // dropped on a day chip → move the place to that day (possibly another leg)
      const targetDay = Number(overId.slice("daychip-".length));
      if (!Number.isFinite(targetDay) || targetDay === src.item.day) return;
      const targetLeg = dayToLeg(targetDay);
      setLegStates((prev) => {
        const next = prev.map((ls) => ({ ...ls, items: [...ls.items] }));
        const [moved] = next[src.legIdx].items.splice(src.itemIdx, 1);
        next[targetLeg].items.push({ ...moved, day: targetDay });
        return next;
      });
      return;
    }

    // dropped on another row → reorder within the visible day
    if (overId === uid) return;
    const dst = findItem(overId);
    if (!dst || dst.legIdx !== src.legIdx || dst.item.day !== src.item.day) return;
    setLegStates((prev) => {
      const next = prev.map((ls) => ({ ...ls, items: [...ls.items] }));
      const items = next[src.legIdx].items;
      const dayIdxs = items.map((it, k) => (it.day === src.item.day ? k : -1)).filter((k) => k >= 0);
      const sub = dayIdxs.map((k) => items[k]);
      const from = sub.findIndex((it) => it.uid === uid);
      const to = sub.findIndex((it) => it.uid === overId);
      if (from < 0 || to < 0) return prev;
      const movedSub = arrayMove(sub, from, to);
      dayIdxs.forEach((k, z) => {
        items[k] = movedSub[z];
      });
      return next;
    });
  }

  function onTabDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = Number(String(active.id).slice("citytab-".length));
    const to = Number(String(over.id).slice("citytab-".length));
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    // remember each leg's old first day, then renumber after the move
    const starts: number[] = [];
    {
      let s = 1;
      legs.forEach((l) => {
        starts.push(s);
        s += l.nights;
      });
    }
    const zipped = legs.map((l, i) => ({
      leg: l,
      st: legStates[i] ?? ({ status: "pending", items: [] } as LegState),
      oldStart: starts[i],
    }));
    const moved = arrayMove(zipped, from, to);
    let s = 1;
    const newLegs: RouteLeg[] = [];
    const newStates: LegState[] = [];
    for (const z of moved) {
      newLegs.push(z.leg);
      newStates.push({ ...z.st, items: z.st.items.map((it) => ({ ...it, day: s + (it.day - z.oldStart) })) });
      s += z.leg.nights;
    }
    setLegs(newLegs);
    setLegStates(newStates);
    // follow the dragged city to its new first day
    let ns = 1;
    for (let i = 0; i < to; i++) ns += newLegs[i].nights;
    setActiveDay(ns);
  }

  function handleAdd(items: AssembledItem[], busyKey: string, closeAfter = false) {
    if (items.length === 0) return;
    setBusy(busyKey);
    startTransition(async () => {
      try {
        const { count } = await addPlannedItems(
          tripId,
          items.map((it) => toPlanned(it, identityDayMap)),
        );
        toast.success(t("aiPlan.toastAdded", { count }));
        if (closeAfter) onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("aiPlan.legFailedGeneric"));
      } finally {
        setBusy(null);
      }
    });
  }

  function handleVote(items: AssembledItem[], busyKey: string, question?: string) {
    if (items.length === 0) return;
    setBusy(busyKey);
    startTransition(async () => {
      try {
        await voteOnPlannedItems(
          tripId,
          items.map((it) => toPlanned(it, identityDayMap)),
          question,
        );
        toast.success(t("aiPlan.toastVote"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("aiPlan.legFailedGeneric"));
      } finally {
        setBusy(null);
      }
    });
  }

  /** the alt duel: main place vs alternative as a two-option Huddle vote */
  function handleDuel(item: AssembledItem, busyKey: string) {
    if (!item.alt) return;
    const altItem: AssembledItem = { ...item, place: item.alt, alt: null };
    handleVote([item, altItem], busyKey, undefined);
  }

  /* ── render ─────────────────────────────────────────────────────── */

  const stepLabel =
    step === 1
      ? t("aiPlan.stepVibe")
      : step === 2
        ? t("aiPlan.stepRhythm")
        : step === 3
          ? t("aiPlan.stepRoute")
          : t("aiPlan.stepJourney");

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t("aiPlan.title")}
      subtitle={t("aiPlan.subtitle", { destination })}
    >
      <div className="p-4 space-y-4">
        {/* step indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${step >= n ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          {t("aiPlan.stepOf", { step, label: stepLabel })}
        </p>

        {/* ─── Step 1: vibe ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">{t("aiPlan.whatsTheVibe")}</p>
              <div className="grid grid-cols-2 gap-2">
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setTravelStyle(s.value)}
                    className={`rounded-xl border p-3 text-start transition-colors ${
                      travelStyle === s.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-semibold">{t(s.labelKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(s.descKey)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">{t("aiPlan.whatAreYouInto")}</p>
              <input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder={t("aiPlan.interestsPlaceholder")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              {t("aiPlan.next")}
            </Button>
          </div>
        )}

        {/* ─── Step 2: rhythm + constraints ─────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">{t("aiPlan.paceQuestion")}</p>
              <div className="grid grid-cols-3 gap-2">
                {PACES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPace(p.value)}
                    className={`rounded-xl border p-2.5 text-center transition-colors ${
                      pace === p.value ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <p className="text-sm font-semibold">{t(p.labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t(p.descKey)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">{t("aiPlan.budgetQuestion")}</p>
              <div className="grid grid-cols-3 gap-2">
                {BUDGETS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setDailyBudget(b.value)}
                    className={`rounded-xl border p-2.5 text-center transition-colors ${
                      dailyBudget === b.value ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <p className="text-sm font-semibold">{t(b.labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t(b.descKey)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">{t("aiPlan.dietaryQuestion")}</p>
              <p className="text-xs text-muted-foreground mb-2">{t("aiPlan.anyApply")}</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setDietary((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      dietary.includes(d) ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">{t("aiPlan.mustSeeQuestion")}</p>
              <input
                value={mustSee}
                onChange={(e) => setMustSee(e.target.value)}
                placeholder={t("aiPlan.mustSeePlaceholder")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">{t("aiPlan.avoidQuestion")}</p>
              <input
                value={avoid}
                onChange={(e) => setAvoid(e.target.value)}
                placeholder={t("aiPlan.avoidPlaceholder")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">{t("aiPlan.gatewayQuestion")}</p>
              <p className="text-xs text-muted-foreground mb-2">{t("aiPlan.gatewayHint")}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={startCity}
                  onChange={(e) => setStartCity(e.target.value)}
                  placeholder={t("aiPlan.startCityPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={endCity}
                  onChange={(e) => setEndCity(e.target.value)}
                  placeholder={t("aiPlan.endCityPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                {t("aiPlan.back")}
              </Button>
              <Button className="flex-1" onClick={fetchRoute} disabled={routeLoading}>
                {routeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-4 h-4 me-1.5" />
                    {t("aiPlan.suggestRoute")}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: the route — the user is the captain ──────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t("aiPlan.routeTitle")}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                  daysBalanced
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {t("aiPlan.routeDaysUsed", { used: usedDays, total: numDays })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{t("aiPlan.routeSubtitle")}</p>

            {/* gateway anchors */}
            {(startCity || endCity) && (
              <div className="flex items-center justify-between text-[12px] font-bold text-muted-foreground px-1">
                <span className="inline-flex items-center gap-1">
                  <AirplaneTilt className="w-4 h-4" />
                  {startCity || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {endCity || startCity || "—"}
                  <AirplaneTilt className="w-4 h-4 -scale-x-100" />
                </span>
              </div>
            )}

            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onLegDragEnd}>
              <SortableContext items={legs.map((_, i) => `leg-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {legs.map((leg, i) => (
                    <SortableLeg
                      key={`leg-${i}`}
                      id={`leg-${i}`}
                      leg={leg}
                      index={i}
                      legsCount={legs.length}
                      t={t}
                      onBump={bumpNights}
                      onRemove={removeLeg}
                      onTravelMode={setTravelModeAt}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* add a city */}
            <div className="flex gap-2">
              <input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCity()}
                placeholder={t("aiPlan.addCityPlaceholder")}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <Button variant="outline" onClick={addCity} disabled={!newCity.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchRoute} disabled={routeLoading}>
                {routeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowsClockwise className="w-4 h-4" />
                )}
              </Button>
              <Button className="flex-1" onClick={startJourney} disabled={!daysBalanced}>
                <Sparkles className="w-4 h-4 me-1.5" />
                {t("aiPlan.startPlanning")}
              </Button>
            </div>
            {!daysBalanced && numDays > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                {t("aiPlan.routeBalanceHint", { total: numDays })}
              </p>
            )}
          </div>
        )}

        {/* ─── Step 4: the journey — day pager (one day at a time) ── */}
        {step === 4 && (
          <div className="space-y-3 pb-24">
            {/* city tabs — click to jump, drag sideways to reorder the trip */}
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={onTabDragEnd}>
              <SortableContext items={legs.map((_, i) => `citytab-${i}`)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-2">
                  {legs.map((leg, i) => (
                    <SortableCityTab
                      key={`citytab-${i}`}
                      id={`citytab-${i}`}
                      label={leg.cityLabel}
                      daysLabel={t("aiPlan.tabDays", { count: leg.nights })}
                      active={i === activeLegIdx}
                      status={legStates[i]?.status ?? "pending"}
                      onSelect={() => setActiveDay(legDays(i)[0])}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <DndContext sensors={dndSensors} collisionDetection={placeCollision} onDragEnd={onPlaceDragEnd}>
              {/* day rail — every chip is also a drop target for place rows */}
              <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {legs.map((_, li) =>
                  legDays(li).map((d) => {
                    const ls = legStates[li];
                    const dItems = ls?.items.filter((it) => it.day === d) ?? [];
                    return (
                      <DayRailChip
                        key={d}
                        day={d}
                        active={d === activeDay}
                        disabled={!ls || ls.status !== "done"}
                        selCount={dItems.filter((it) => selected.has(it.uid)).length}
                        total={dItems.length}
                        onSelect={() => setActiveDay(d)}
                      />
                    );
                  }),
                )}
              </div>

              {/* day header: prev · Day N — city · next */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDay(allDaysFlat[dayPos - 1] ?? activeDay)}
                  disabled={dayPos <= 0}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0"
                  aria-label={t("aiPlan.back")}
                >
                  <CaretLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
                <div className="flex-1 text-center min-w-0">
                  <p className="text-sm font-bold truncate">
                    {t("aiPlan.dayLabel", { n: activeDay })} · {legs[activeLegIdx]?.cityLabel}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {t("aiPlan.placesCount", { count: dayItems.length })}
                    {dayItems[0]?.startTime ? <> · {t("aiPlan.startsAt", { time: dayItems[0].startTime })}</> : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDay(allDaysFlat[dayPos + 1] ?? activeDay)}
                  disabled={dayPos >= allDaysFlat.length - 1}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0"
                  aria-label={t("aiPlan.next")}
                >
                  <CaretRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>

              {/* the day's places */}
              {!activeLegState || activeLegState.status === "pending" ? (
                <div className="rounded-xl border border-dashed border-border/70 p-4 opacity-60">
                  <p className="text-sm text-muted-foreground">{t("aiPlan.queued")}</p>
                </div>
              ) : activeLegState.status === "loading" ? (
                <div className="rounded-xl border border-border p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {t("aiPlan.planningLeg", { city: legs[activeLegIdx]?.cityLabel ?? "" })}
                  </p>
                </div>
              ) : activeLegState.status === "error" ? (
                <div className="rounded-xl border border-destructive/40 p-4 space-y-2">
                  <p className="text-sm text-destructive">{activeLegState.error}</p>
                  <Button size="sm" variant="outline" onClick={() => retryLeg(activeLegIdx)}>
                    {t("aiPlan.retry")}
                  </Button>
                </div>
              ) : dayItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 p-4">
                  <p className="text-xs text-muted-foreground text-center">{t("aiPlan.emptyDay")}</p>
                </div>
              ) : (
                <SortableContext items={dayItems.map((it) => it.uid)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {dayItems.map((item) => (
                      <SortablePlaceRow
                        key={item.uid}
                        item={item}
                        dayColor={getDayColor(activeDay - 1)}
                        isSel={selected.has(item.uid)}
                        isOpen={expanded.has(item.uid)}
                        busy={busy}
                        t={t}
                        onToggleSel={() => toggleKey(item.uid)}
                        onToggleOpen={() => toggleExpanded(item.uid)}
                        onAddOne={() => handleAdd([item], `add-${item.uid}`)}
                        onDuel={() => handleDuel(item, `duel-${item.uid}`)}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}

              {activeLegState?.status === "done" && activeLegState.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleAdd(activeLegState.items, `add-leg-${activeLegIdx}`)}
                  disabled={busy !== null}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-[12px] font-bold text-primary hover:border-primary/50 disabled:opacity-50"
                >
                  {busy === `add-leg-${activeLegIdx}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t("aiPlan.addLeg")}
                    </>
                  )}
                </button>
              )}
            </DndContext>

            {/* sticky bulk bar */}
            {allEntries.length > 0 && (
              <div className="fixed bottom-0 inset-x-0 sm:absolute border-t border-border bg-background/95 backdrop-blur p-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allDaySel = dayItems.length > 0 && dayItems.every((it) => selected.has(it.uid));
                    setSelected((prev) => {
                      const next = new Set(prev);
                      dayItems.forEach((it) => {
                        if (allDaySel) next.delete(it.uid);
                        else next.add(it.uid);
                      });
                      return next;
                    });
                  }}
                  disabled={dayItems.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  {dayItems.length > 0 && dayItems.every((it) => selected.has(it.uid)) ? (
                    <CheckSquare className="w-4 h-4 text-primary" weight="fill" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {t("aiPlan.dayLabel", { n: activeDay })} ({daySelCount}/{dayItems.length})
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ms-auto border-primary/35 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                  disabled={daySelCount === 0 || busy !== null}
                  onClick={() =>
                    handleAdd(
                      dayItems.filter((it) => selected.has(it.uid)),
                      `add-day-${activeDay}`,
                    )
                  }
                >
                  {busy === `add-day-${activeDay}` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("aiPlan.addDay", { count: daySelCount })
                  )}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedEntries.length === 0 || busy !== null}
                  onClick={() => handleAdd(selectedEntries.map((e) => e.item), "add-bulk", true)}
                >
                  {busy === "add-bulk" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 me-1" />
                      {t("aiPlan.addSelected", { count: selectedEntries.length })}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
