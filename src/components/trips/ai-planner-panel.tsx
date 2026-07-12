"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkle as Sparkles, CircleNotch as Loader2, CheckCircle as CheckCircle2, MapPin, Clock, ForkKnife as Utensils, Buildings as Hotel, Bus, Ticket, Plus, CheckSquareOffset as Vote, CheckSquare, Square } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { toast } from "sonner";
import { addPlannedItems, voteOnPlannedItems, type PlannedActivity } from "@/lib/actions/ai-planner";
import { useT } from "@/components/i18n/locale-provider";

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  destination: string;
}

interface AiPlannerResult {
  summary: string;
  tips: string[];
  activities: PlannedActivity[];
}

// B15-f: labels are i18n keys; resolved at render time so a runtime
// language switch relabels the wizard without remounting state.
const TRAVEL_STYLES = [
  { value: "adventure", labelKey: "aiPlan.vibeAdventure", descKey: "aiPlan.vibeAdventureDesc" },
  { value: "relaxed", labelKey: "aiPlan.vibeRelaxed", descKey: "aiPlan.vibeRelaxedDesc" },
  { value: "cultural", labelKey: "aiPlan.vibeCultural", descKey: "aiPlan.vibeCulturalDesc" },
  { value: "foodie", labelKey: "aiPlan.vibeFoodie", descKey: "aiPlan.vibeFoodieDesc" },
  { value: "budget", labelKey: "aiPlan.vibeBudget", descKey: "aiPlan.vibeBudgetDesc" },
  { value: "luxury", labelKey: "aiPlan.vibeLuxury", descKey: "aiPlan.vibeLuxuryDesc" },
] as const;

type TravelStyle = typeof TRAVEL_STYLES[number]["value"];

const TYPE_ICON: Record<string, React.ReactNode> = {
  activity: <Ticket className="w-3 h-3" />,
  accommodation: <Hotel className="w-3 h-3" />,
  transport: <Bus className="w-3 h-3" />,
  meal: <Utensils className="w-3 h-3" />,
};

const TYPE_COLOR: Record<string, string> = {
  activity: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30",
  accommodation: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
  transport: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
  meal: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
};

// B15-f: loading messages live as i18n keys; the t() call happens
// inside the render so a language flip mid-load shows the new copy.
const LOADING_KEYS = [
  "aiPlan.loadingScouting",
  "aiPlan.loadingBalancing",
  "aiPlan.loadingHidden",
  "aiPlan.loadingLocal",
  "aiPlan.loadingCrafting",
] as const;

export function AiPlannerPanel({ open, onClose, tripId, destination }: Props) {
  const router = useRouter();
  const t = useT();

  const [travelStyle, setTravelStyle] = useState<TravelStyle>("cultural");
  const [interests, setInterests] = useState("");
  const [notes, setNotes] = useState("");
  // B3-b: structured questionnaire. Step counter drives the multi-pane
  // form below (Vibe → Rhythm → Constraints → Generate).
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pace, setPace] = useState<"chill" | "balanced" | "packed">("balanced");
  const [dailyBudget, setDailyBudget] = useState<"shoestring" | "mid" | "splurge">("mid");
  const [dietary, setDietary] = useState<string[]>([]);
  const [mustSee, setMustSee] = useState("");
  const [avoid, setAvoid] = useState("");

  function toggleDietary(tag: string) {
    setDietary((prev) =>
      prev.includes(tag) ? prev.filter((d) => d !== tag) : [...prev, tag],
    );
  }
  const [plan, setPlan] = useState<AiPlannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // keys are "day-index"
  const [busy, setBusy] = useState<string | null>(null); // which action is running
  const [, startTransition] = useTransition();

  // Group by day
  const byDay = useMemo(() => {
    const map: Record<number, PlannedActivity[]> = {};
    plan?.activities.forEach((a) => {
      (map[a.day] ??= []).push(a);
    });
    return map;
  }, [plan]);

  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  const allKeys = plan?.activities.map((_, i) => `k-${i}`) ?? [];
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const selectedItems: PlannedActivity[] = plan
    ? plan.activities.filter((_, i) => selected.has(`k-${i}`))
    : [];

  async function generate() {
    setPlan(null);
    setSelected(new Set());
    setLoading(true);
    let msgIdx = 0;
    setLoadingMsg(0);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_KEYS.length;
      setLoadingMsg(msgIdx);
    }, 2200);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          travelStyle,
          interests,
          notes,
          pace,
          dailyBudget,
          dietary,
          mustSee,
          avoid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate plan");
        return;
      }
      setPlan(data);
      // Select all by default
      setSelected(new Set(data.activities.map((_: any, i: number) => `k-${i}`)));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate plan");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  function toggleOne(idx: number) {
    const key = `k-${idx}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allKeys));
  }

  function handleAddSingle(idx: number) {
    if (!plan) return;
    setBusy(`add-${idx}`);
    startTransition(async () => {
      try {
        await addPlannedItems(tripId, [plan.activities[idx]]);
        toast.success("Added to itinerary");
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to add");
      } finally {
        setBusy(null);
      }
    });
  }

  function handleVoteSingle(idx: number) {
    if (!plan) return;
    setBusy(`vote-${idx}`);
    startTransition(async () => {
      try {
        await voteOnPlannedItems(tripId, [plan.activities[idx]]);
        toast.success("Vote posted to chat!");
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create vote");
      } finally {
        setBusy(null);
      }
    });
  }

  function handleAddSelected() {
    if (selectedItems.length === 0) return;
    setBusy("add-bulk");
    startTransition(async () => {
      try {
        const { count } = await addPlannedItems(tripId, selectedItems);
        toast.success(`Added ${count} ${count === 1 ? "item" : "items"} to itinerary`);
        onClose();
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to add");
      } finally {
        setBusy(null);
      }
    });
  }

  function handleVoteSelected() {
    if (selectedItems.length === 0) return;
    setBusy("vote-bulk");
    startTransition(async () => {
      try {
        await voteOnPlannedItems(tripId, selectedItems);
        toast.success("Vote posted to chat!");
        onClose();
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to create vote");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t("aiPlan.title")}
      subtitle={t("aiPlan.subtitle", { destination })}
      icon={<Sparkles className="w-4 h-4 text-white" />}
      accentGradient="from-primary to-primary"
      width="md"
    >
      {/* B3-b: 3-step questionnaire — Vibe → Rhythm → Constraints. Each
          step is a single screen so the user is never overwhelmed by a
          wall of inputs (the old single-form approach). */}
      {!plan && (
        <div className="p-4 space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step >= n ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            {t("aiPlan.stepOf", {
              step,
              label: t(step === 1 ? "aiPlan.stepVibe" : step === 2 ? "aiPlan.stepRhythm" : "aiPlan.stepConstraints"),
            })}
          </p>

          {/* ─── Step 1: Vibe ─────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold">{t("aiPlan.whatsTheVibe")}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {TRAVEL_STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTravelStyle(s.value)}
                      className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all ${
                        travelStyle === s.value
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-sm">{t(s.labelKey)}</span>
                      <span className="text-[10px] text-muted-foreground">{t(s.descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  {t("aiPlan.whatAreYouInto")} <span className="font-normal text-muted-foreground">({t("expenses.notesOptional")})</span>
                </label>
                <input
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder={t("aiPlan.interestsPlaceholder")}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* ─── Step 2: Rhythm ───────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold">{t("aiPlan.paceQuestion")}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { v: "chill" as const, labelKey: "aiPlan.paceChill", descKey: "aiPlan.paceChillDesc" },
                    { v: "balanced" as const, labelKey: "aiPlan.paceBalanced", descKey: "aiPlan.paceBalancedDesc" },
                    { v: "packed" as const, labelKey: "aiPlan.pacePacked", descKey: "aiPlan.pacePackedDesc" },
                  ].map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setPace(p.v)}
                      className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all ${
                        pace === p.v
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-sm">{t(p.labelKey)}</span>
                      <span className="text-[10px] text-muted-foreground">{t(p.descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold">{t("aiPlan.budgetQuestion")}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { v: "shoestring" as const, labelKey: "aiPlan.budgetShoestring", descKey: "aiPlan.budgetShoestringDesc" },
                    { v: "mid" as const, labelKey: "aiPlan.budgetMid", descKey: "aiPlan.budgetMidDesc" },
                    { v: "splurge" as const, labelKey: "aiPlan.budgetSplurge", descKey: "aiPlan.budgetSplurgeDesc" },
                  ].map((b) => (
                    <button
                      key={b.v}
                      type="button"
                      onClick={() => setDailyBudget(b.v)}
                      className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all ${
                        dailyBudget === b.v
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border/60 hover:border-border hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-sm">{t(b.labelKey)}</span>
                      <span className="text-[10px] text-muted-foreground">{t(b.descKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Constraints ──────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold">
                  {t("aiPlan.dietaryQuestion")} <span className="font-normal text-muted-foreground">{t("aiPlan.anyApply")}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["vegetarian", "vegan", "halal", "kosher", "gluten-free", "nut allergy"].map((tag) => {
                    const on = dietary.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDietary(tag)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-all ${
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  {t("aiPlan.mustSeeQuestion")} <span className="font-normal text-muted-foreground">({t("expenses.notesOptional")})</span>
                </label>
                <input
                  value={mustSee}
                  onChange={(e) => setMustSee(e.target.value)}
                  placeholder={t("aiPlan.mustSeePlaceholder")}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  {t("aiPlan.avoidQuestion")} <span className="font-normal text-muted-foreground">({t("expenses.notesOptional")})</span>
                </label>
                <input
                  value={avoid}
                  onChange={(e) => setAvoid(e.target.value)}
                  placeholder={t("aiPlan.avoidPlaceholder")}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  {t("aiPlan.notesQuestion")} <span className="font-normal text-muted-foreground">({t("expenses.notesOptional")})</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("aiPlan.notesPlaceholder")}
                  rows={2}
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 pt-1">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                disabled={loading}
                className="flex-1"
              >
                {t("aiPlan.back")}
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                className="flex-1 bg-primary hover:opacity-90 border-0"
              >
                {t("aiPlan.next")}
              </Button>
            ) : (
              <Button
                onClick={generate}
                disabled={loading}
                className="flex-1 bg-primary hover:opacity-90 border-0 shadow-sm shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    {t(LOADING_KEYS[loadingMsg])}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 me-2" />
                    {t("aiPlan.generate")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading (first-time) */}
      {loading && !plan && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-muted/40 border px-3 py-4 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">{t(LOADING_KEYS[loadingMsg])}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {plan && (
        <div className="flex flex-col">
          {/* Summary + tips */}
          <div className="p-4 space-y-3 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground leading-relaxed">{plan.summary}</p>
            {plan.tips.length > 0 && (
              <div className="space-y-1">
                {plan.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-amber-500 mt-0.5">💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bulk toolbar */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selectedItems.length} of {plan.activities.length} selected
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              className="text-xs text-primary hover:underline"
            >
              {loading ? "Regenerating…" : "Regenerate"}
            </button>
          </div>

          {/* Day-by-day items */}
          <div className="p-4 space-y-4">
            {days.map((day) => (
              <div key={day} className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Day {day}
                </p>
                <div className="space-y-1.5">
                  {byDay[day].map((act) => {
                    const idx = plan.activities.indexOf(act);
                    const key = `k-${idx}`;
                    const isSelected = selected.has(key);
                    const addBusy = busy === `add-${idx}`;
                    const voteBusy = busy === `vote-${idx}`;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border bg-background p-2.5 space-y-1.5 transition-colors ${
                          isSelected ? "border-primary/50 bg-primary/[0.02]" : "border-border/60"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleOne(idx)}
                            className="shrink-0 mt-0.5"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <span
                            className={`shrink-0 rounded-md p-1 mt-0.5 ${
                              TYPE_COLOR[act.type] ?? ""
                            }`}
                          >
                            {TYPE_ICON[act.type]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug">{act.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {act.startTime && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Clock className="w-2.5 h-2.5" />
                                  {act.startTime}
                                </span>
                              )}
                              {act.locationName && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate max-w-[180px]">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {act.locationName}
                                </span>
                              )}
                              {act.costEstimate !== undefined && act.costEstimate > 0 && (
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  ~${act.costEstimate}
                                </span>
                              )}
                            </div>
                            {act.notes && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                                {act.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Per-item actions */}
                        <div className="flex items-center gap-1.5 pl-[26px]">
                          <button
                            type="button"
                            onClick={() => handleAddSingle(idx)}
                            disabled={addBusy || voteBusy}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors disabled:opacity-50"
                          >
                            {addBusy ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Plus className="w-2.5 h-2.5" />
                            )}
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVoteSingle(idx)}
                            disabled={addBusy || voteBusy}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 dark:hover:bg-violet-950/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors disabled:opacity-50"
                          >
                            {voteBusy ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Vote className="w-2.5 h-2.5" />
                            )}
                            Vote
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky bulk action bar */}
          <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur p-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleVoteSelected}
              disabled={selectedItems.length === 0 || busy !== null}
              className="flex-1"
            >
              {busy === "vote-bulk" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Vote className="w-3.5 h-3.5 me-1.5" />
                  Vote on {selectedItems.length}
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleAddSelected}
              disabled={selectedItems.length === 0 || busy !== null}
              className="flex-1 bg-primary hover:opacity-90 border-0"
            >
              {busy === "add-bulk" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />
                  Add {selectedItems.length} to plan
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </SidePanel>
  );
}
