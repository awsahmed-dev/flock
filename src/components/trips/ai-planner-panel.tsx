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
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, CaretDown } from "@phosphor-icons/react/dist/ssr";

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
interface LegState {
  status: "pending" | "loading" | "done" | "error";
  summary?: string;
  items: AssembledItem[];
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
  flight: <AirplaneTilt className="w-3.5 h-3.5" />,
  train: <Train className="w-3.5 h-3.5" />,
  bus: <Bus className="w-3.5 h-3.5" />,
  car: <Car className="w-3.5 h-3.5" />,
  ferry: <Boat className="w-3.5 h-3.5" />,
  walk: <PersonSimpleWalk className="w-3.5 h-3.5" />,
};
const TRAVEL_MODES = Object.keys(TRAVEL_ICON) as TravelMode[];

function priceGlyphs(level: number | null): string {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(level, 4));
}

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
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-80 z-10 relative" : ""}
    >
      {/* travel hop chip */}
      {index > 0 && (
        <div className="flex items-center gap-2 ps-4 pb-2">
          <select
            value={leg.travel?.mode ?? "car"}
            onChange={(e) => onTravelMode(index, e.target.value as TravelMode)}
            className="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-semibold"
            aria-label={t("aiPlan.travelMode")}
          >
            {TRAVEL_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`aiPlan.travel_${m}`)}
              </option>
            ))}
          </select>
          {leg.travel?.note ? (
            <span className="text-[11px] text-muted-foreground truncate">{leg.travel.note}</span>
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
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="shrink-0 mt-0.5 text-muted-foreground touch-none cursor-grab active:cursor-grabbing"
              aria-label="drag"
            >
              <DotsSixVertical className="w-4.5 h-4.5" />
            </button>
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
                <Minus className="w-3.5 h-3.5" />
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
                <Plus className="w-3.5 h-3.5" />
              </button>
              {legsCount > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
                  aria-label={t("common.delete")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
  const [selected, setSelected] = useState<Set<string>>(new Set()); // "leg-item"
  const [busy, setBusy] = useState<string | null>(null);
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

  // journey step: which day sections are expanded ("legIdx-day")
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
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
        states[i] = { status: "done", summary: data.summary, items: data.items };
        // pre-select everything from this leg, expand its first day
        setSelected((prev) => {
          const next = new Set(prev);
          (data.items as AssembledItem[]).forEach((_, j) => next.add(`${i}-${j}`));
          return next;
        });
        const firstDay = (data.items as AssembledItem[])
          .map((it) => it.day)
          .sort((a, b) => a - b)[0];
        if (firstDay != null) setOpenDays((prev) => new Set(prev).add(`${i}-${firstDay}`));
        (data.items as AssembledItem[]).forEach((it) => {
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
      states[i] = { status: "done", summary: data.summary, items: data.items };
      setSelected((prev) => {
        const next = new Set(prev);
        (data.items as AssembledItem[]).forEach((_, j) => next.add(`${i}-${j}`));
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

  const allEntries: { key: string; item: AssembledItem }[] = legStates.flatMap((ls, i) =>
    ls.items.map((item, j) => ({ key: `${i}-${j}`, item })),
  );
  const allSelected = allEntries.length > 0 && allEntries.every((e) => selected.has(e.key));
  const selectedEntries = allEntries.filter((e) => selected.has(e.key));

  function toggleKey(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
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
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-1">
                <span className="inline-flex items-center gap-1">
                  <AirplaneTilt className="w-3.5 h-3.5" />
                  {startCity || "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {endCity || startCity || "—"}
                  <AirplaneTilt className="w-3.5 h-3.5 -scale-x-100" />
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

        {/* ─── Step 4: the journey — real places, leg by leg ────── */}
        {step === 4 && (
          <div className="space-y-5 pb-24">
            {legs.map((leg, i) => {
              const ls = legStates[i];
              if (!ls) return null;
              const byDay = new Map<number, { key: string; item: AssembledItem }[]>();
              ls.items.forEach((item, j) => {
                const arr = byDay.get(item.day) ?? [];
                arr.push({ key: `${i}-${j}`, item });
                byDay.set(item.day, arr);
              });
              return (
                <section key={`${leg.city}-${i}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold">{leg.cityLabel}</p>
                    {ls.status === "done" && (
                      <button
                        type="button"
                        onClick={() => handleAdd(ls.items, `add-leg-${i}`)}
                        disabled={busy !== null}
                        className="ms-auto text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
                      >
                        {busy === `add-leg-${i}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          t("aiPlan.addLeg")
                        )}
                      </button>
                    )}
                  </div>

                  {ls.status === "loading" ? (
                    <div className="rounded-xl border border-border p-4 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {t("aiPlan.planningLeg", { city: leg.cityLabel })}
                      </p>
                    </div>
                  ) : ls.status === "pending" ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-4 opacity-60">
                      <p className="text-sm text-muted-foreground">{t("aiPlan.queued")}</p>
                    </div>
                  ) : ls.status === "error" ? (
                    <div className="rounded-xl border border-destructive/40 p-4 space-y-2">
                      <p className="text-sm text-destructive">{ls.error}</p>
                      <Button size="sm" variant="outline" onClick={() => retryLeg(i)}>
                        {t("aiPlan.retry")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ls.summary ? (
                        <p className="text-xs text-muted-foreground">{ls.summary}</p>
                      ) : null}
                      {[...byDay.keys()]
                        .sort((a, b) => a - b)
                        .map((day) => {
                          const dayKey = `${i}-${day}`;
                          const isOpen = openDays.has(dayKey);
                          return (
                          <div key={day} className="rounded-xl border border-border/70 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDays((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(dayKey)) next.delete(dayKey);
                                  else next.add(dayKey);
                                  return next;
                                })
                              }
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40"
                            >
                              <span className="text-[12px] font-bold">
                                {t("aiPlan.dayLabel", { n: day })}
                                <span className="text-muted-foreground font-semibold ms-2">
                                  {t("aiPlan.placesCount", { count: byDay.get(day)!.length })}
                                </span>
                              </span>
                              <CaretDown
                                className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                            {isOpen && (
                            <div className="space-y-2 p-2">
                              {byDay.get(day)!.map(({ key, item }) => {
                                const isSel = selected.has(key);
                                return (
                                  <div
                                    key={key}
                                    className={`rounded-xl border overflow-hidden transition-colors ${
                                      isSel ? "border-primary/50" : "border-border"
                                    }`}
                                  >
                                    <div className="flex gap-3 p-3">
                                      <button
                                        type="button"
                                        onClick={() => toggleKey(key)}
                                        className="shrink-0 mt-0.5 text-primary"
                                        aria-label={isSel ? "deselect" : "select"}
                                      >
                                        {isSel ? (
                                          <CheckSquare className="w-4.5 h-4.5" weight="fill" />
                                        ) : (
                                          <Square className="w-4.5 h-4.5 text-muted-foreground" />
                                        )}
                                      </button>
                                      {item.place.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={item.place.photoUrl}
                                          alt=""
                                          loading="lazy"
                                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                                        />
                                      ) : (
                                        <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                                          {item.type === "meal" ? (
                                            <Utensils className="w-5 h-5 text-muted-foreground" />
                                          ) : (
                                            <Ticket className="w-5 h-5 text-muted-foreground" />
                                          )}
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold leading-snug">
                                          {item.place.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                                          {item.place.rating != null && (
                                            <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
                                              <Star className="w-3 h-3" weight="fill" />
                                              {item.place.rating.toFixed(1)}
                                              {item.place.userRatingsTotal ? (
                                                <span className="text-muted-foreground font-normal">
                                                  ({item.place.userRatingsTotal.toLocaleString()})
                                                </span>
                                              ) : null}
                                            </span>
                                          )}
                                          {priceGlyphs(item.place.priceLevel) && (
                                            <span>{priceGlyphs(item.place.priceLevel)}</span>
                                          )}
                                          {item.startTime && (
                                            <span className="inline-flex items-center gap-0.5">
                                              <Clock className="w-3 h-3" />
                                              {item.startTime}
                                            </span>
                                          )}
                                        </div>
                                        {item.note ? (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {item.note}
                                          </p>
                                        ) : null}
                                        <div className="flex items-center gap-3 mt-2">
                                          <a
                                            href={item.place.mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                          >
                                            <ArrowSquareOut className="w-3 h-3" />
                                            {t("aiPlan.openInGoogle")}
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => handleAdd([item], `add-${key}`)}
                                            disabled={busy !== null}
                                            aria-label={t("aiPlan.addOne")}
                                            className="ms-auto w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:border-primary/50 disabled:opacity-50"
                                          >
                                            {busy === `add-${key}` ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Plus className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* the duel: a real alternative → crew vote */}
                                    {item.alt && (
                                      <div className="border-t border-dashed border-border bg-muted/40 px-3 py-2 flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                          {t("aiPlan.orAlt")}
                                        </span>
                                        <span className="text-[12px] font-semibold truncate">
                                          {item.alt.name}
                                          {item.alt.rating != null && (
                                            <span className="text-amber-600 dark:text-amber-400 ms-1">
                                              ★{item.alt.rating.toFixed(1)}
                                            </span>
                                          )}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleDuel(item, `duel-${key}`)}
                                          disabled={busy !== null}
                                          className="ms-auto inline-flex items-center gap-1 rounded-full border border-primary/40 text-primary px-2.5 py-1 text-[11px] font-bold hover:bg-primary/10 disabled:opacity-50 shrink-0"
                                        >
                                          {busy === `duel-${key}` ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Vote className="w-3 h-3" />
                                          )}
                                          {t("aiPlan.askCrew")}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </div>
                          );
                        })}
                    </div>
                  )}
                </section>
              );
            })}

            {/* sticky bulk bar */}
            {allEntries.length > 0 && (
              <div className="fixed bottom-0 inset-x-0 sm:absolute border-t border-border bg-background/95 backdrop-blur p-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelected(allSelected ? new Set() : new Set(allEntries.map((e) => e.key)))
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary" weight="fill" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {t("aiPlan.selectAll")}
                </button>
                <Button
                  size="sm"
                  className="ms-auto"
                  disabled={selectedEntries.length === 0 || busy !== null}
                  onClick={() =>
                    handleAdd(selectedEntries.map((e) => e.item), "add-bulk", true)
                  }
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
