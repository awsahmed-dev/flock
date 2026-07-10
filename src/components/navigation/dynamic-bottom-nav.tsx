"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format as isoFmt } from "date-fns";
import { toast } from "sonner";
import {
  Compass, Plus, MapPin, ChevronRight, Users, CalendarDays, Sparkles,
  Wallet, Share2, PlaneTakeoff, Navigation, Image as ImageIcon, HandCoins,
  Luggage, Camera, Map as MapIcon, Bookmark, Clock, Search, MessageCircle,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Tabs,
  TabsList,
  TabsHighlight,
  TabsHighlightItem,
} from "@/components/animate-ui/primitives/animate/tabs";
import { AddPlaceSearch } from "@/components/itinerary/add-place-search";
import { AddDocumentDialog } from "@/components/documents/add-document-dialog";
import { createPackingItem } from "@/lib/actions/packing";
import { BudgetSheet } from "@/components/trips/budget-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { tripPhase, type TripPhase } from "@/lib/trip-phase";
import { createClient } from "@/lib/supabase/client";

/**
 * Phase 6 §3-A — the phase-aware NavPill.
 *
 * ASSEMBLY: [44px Huddle circle] [8px] [pill min(250px, calc(100vw-140px))]
 *           [8px] [44px accent + circle], wrapper fixed bottom, justify-center,
 *           safe-area padding inline. All backdropFilter INLINE (§0 rule 1) —
 *           the bundler strips it from stylesheets.
 *
 * Tabs, [+] default, and labels all come from tripPhase() — the single
 * source of truth (§2). The pill is NEVER hard 250px (§0 rule 8): it
 * shrinks on 360px viewports via min().
 */
const CIRCLE_GLASS = {
  background: "var(--pill-bg)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid var(--pill-border)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
  pointerEvents: "auto" as const,
};
const PILL_GLASS = {
  width: "min(250px, calc(100vw - 140px))",
  borderRadius: "9999px",
  background: "var(--pill-bg)",
  backdropFilter: "saturate(180%) blur(16px)",
  WebkitBackdropFilter: "saturate(180%) blur(16px)",
  border: "1px solid var(--pill-border)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
  pointerEvents: "auto" as const,
  transform: "translateZ(0)",
  overflow: "hidden" as const,
};

interface Tab { key: string; label: string; icon: LucideIcon; href: string }

export function DynamicBottomNav({
  tripId,
  destination = "",
  days = [],
  startDate,
  endDate,
  currency = "USD",
  budgetTotal = null,
}: {
  tripId: string;
  destination?: string;
  days?: string[];
  startDate: string;
  endDate: string;
  currency?: string;
  budgetTotal?: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const base = `/trips/${tripId}`;
  const phase: TripPhase = tripPhase({ startDate, endDate });

  const [plusOpen, setPlusOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  // Sprint 4 FIX-4/5a: quick-add composers owned by the + menu.
  const [packOpen, setPackOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [huddleBadge, setHuddleBadge] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  useEffect(() => {
    const onCount = (e: Event) => setSavedCount((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener("discover:savedCount", onCount as EventListener);
    window.dispatchEvent(new CustomEvent("discover:requestCount"));
    return () => window.removeEventListener("discover:savedCount", onCount as EventListener);
  }, [pathname]);

  // §3-A tab config per phase. Money always → /money (the /expenses era
  // routes 301 there).
  const tabs: Tab[] =
    phase === "RECAP"
      ? [
          { key: "recap", label: t("nav.recap"), icon: Sparkles, href: base },
          { key: "photos", label: t("nav.photos"), icon: ImageIcon, href: `${base}/recap/photos` },
          { key: "settle", label: t("nav.settle"), icon: HandCoins, href: `${base}/money` },
        ]
      : [
          {
            key: "plan",
            label: phase === "LIVE" ? t("nav.today") : t("nav.plan"),
            icon: phase === "LIVE" ? Navigation : phase === "DEPARTURE" ? PlaneTakeoff : MapPin,
            href: base,
          },
          {
            key: "discover",
            label: phase === "LIVE" ? t("nav.nearby") : t("nav.discover"),
            icon: Compass,
            href: `${base}/discover`,
          },
          { key: "money", label: t("nav.money"), icon: Wallet, href: `${base}/money` },
        ];

  const activeIndex = (() => {
    if (pathname.startsWith(`${base}/discover`)) return phase === "RECAP" ? 0 : 1;
    if (pathname.startsWith(`${base}/recap/photos`)) return 1;
    if (/^\/trips\/[^/]+\/(money|expenses|wallet|manage|pack|members|settings)/.test(pathname)) return 2;
    return 0; // trip root (cockpit) and everything else
  })();

  // Huddle badge: open decisions the user hasn't reacted to + unread thread
  // replies. Client-side count via RLS-protected supabase — cheap, cached
  // per route change.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: open } = await supabase
          .from("huddle_decisions")
          .select("id")
          .eq("trip_id", tripId)
          .eq("status", "open");
        if (!open || cancelled) return;
        if (open.length === 0) { setHuddleBadge(0); return; }
        const { data: mine } = await supabase
          .from("decision_reactions")
          .select("decision_id")
          .eq("user_id", user.id)
          .in("decision_id", open.map((d) => d.id));
        if (cancelled) return;
        const reacted = new Set((mine ?? []).map((r) => r.decision_id));
        setHuddleBadge(open.filter((d) => !reacted.has(d.id)).length);
      } catch {
        /* badge is decoration — never break nav over it */
      }
    })();
    return () => { cancelled = true; };
  }, [tripId, pathname]);

  const todayIso = isoFmt(new Date(), "yyyy-MM-dd");
  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? "";

  // [+] behavior: single tap = phase default; long-press 400ms = full sheet.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function onPlusDown() {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      setPlusOpen(true);
    }, 400);
  }
  function onPlusUp() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }
  function onPlusClick() {
    // FIX 1: click is the tap path — synthesized reliably on mobile even
    // with slight finger movement (pointerup is not). The contextual
    // right-circle action (`right.action`) covers every tab + phase.
    if (!longPressed.current) right.action();
  }
  function onPlusCancel() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  const dispatch = (name: string) => window.dispatchEvent(new CustomEvent(name));

  // ── Phase 7 §2: contextual satellites — icons/actions follow the tab. ──
  const isDiscoverTab = activeIndex === 1 && phase !== "RECAP";
  const isMoneyTab = activeIndex === 2;
  const isTodayTab = activeIndex === 0 && phase === "LIVE";

  const left: { icon: LucideIcon; label: string; action: () => void; badge: number } = isTodayTab
    ? { icon: MapIcon, label: t("nav.map"), action: () => dispatch("paxawa:toggleMapView"), badge: 0 }
    : isDiscoverTab
      ? { icon: Bookmark, label: t("discover.savedTitle"), action: () => dispatch("discover:openWishlist"), badge: savedCount }
      : isMoneyTab
        ? { icon: Clock, label: t("expenses.activity"), action: () => dispatch("money:scrollActivity"), badge: 0 }
        : { icon: MessageCircle, label: t("nav.huddle"), action: () => router.push(`${base}/huddle`), badge: 0 };

  const right: { icon: LucideIcon; accent: boolean; label: string; action: () => void } = isDiscoverTab
    ? { icon: Search, accent: false, label: t("nav.search"), action: () => dispatch("discover:toggleSearch") }
    : isMoneyTab
      ? {
          icon: phase === "LIVE" ? Camera : Plus,
          accent: true,
          label: t("nav.add"),
          action: () =>
            phase === "LIVE" ? router.push(`${base}/money/expense-camera`) : dispatch("paxawa:logExpense"),
        }
      : phase === "RECAP"
        ? { icon: Share2, accent: true, label: t("nav.shareTrip"), action: () => dispatch("paxawa:shareWrap") }
        : phase === "LIVE"
          ? { icon: Camera, accent: true, label: t("nav.add"), action: () => router.push(`${base}/money/expense-camera`) }
          : { icon: Plus, accent: true, label: t("nav.add"), action: () => setPlusOpen(true) };

  // Left long-press (400ms) → Huddle, when decisions are pending.
  const leftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftLong = useRef(false);
  function onLeftDown() {
    leftLong.current = false;
    leftTimer.current = setTimeout(() => {
      leftLong.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      router.push(`${base}/huddle`);
    }, 400);
  }
  function onLeftUp() {
    if (leftTimer.current) clearTimeout(leftTimer.current);
  }
  function onLeftClick() {
    // FIX 1: click is the tap path — synthesized reliably on mobile even
    // with slight finger movement (pointerup is not).
    if (!leftLong.current) left.action();
  }
  function onLeftCancel() {
    if (leftTimer.current) clearTimeout(leftTimer.current);
  }

  return (
    <div className="xl:hidden">
      {/* §3-A cluster: [Huddle 44] [8] [pill] [8] [+ 44]. */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-center gap-2 px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)", pointerEvents: "none" }}
      >
        {/* LEFT — contextual satellite (§2). Icon changes per tab; the
            huddle needs-you dot persists on EVERY icon; long-press → Huddle. */}
        <button
          type="button"
          onClick={onLeftClick}
          onPointerDown={onLeftDown}
          onPointerUp={onLeftUp}
          onPointerCancel={onLeftCancel}
          onPointerLeave={onLeftCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={left.label}
          className="w-11 h-11 rounded-full flex items-center justify-center relative active:scale-95 shrink-0"
          style={CIRCLE_GLASS}
        >
          <span key={`left-${left.label}`} style={{ animation: "fadeIn 200ms ease" }}>
            <left.icon size={20} className="text-foreground" />
          </span>
          {left.badge > 0 && (
            <span
              className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-0.5 rounded-full bg-primary text-white flex items-center justify-center"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {left.badge > 9 ? "9+" : left.badge}
            </span>
          )}
          {huddleBadge > 0 && (
            <span
              className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full ring-2 ring-background"
              style={{ background: "#FF453A" }}
              aria-label={`${huddleBadge} decisions need you`}
            />
          )}
        </button>

        {/* CENTER pill — phase tabs. Brief A: the thumb is Animate UI's
            layoutId spring highlight (mode "children"), styled per FIX 6:
            elevation not color — white pill w/ shadow, inline so Lightning
            CSS can't strip the layered shadow. Links stay Links (prefetch,
            real navigation); the route controls the Tabs value. */}
        <Tabs
          value={tabs[activeIndex].key}
          aria-label="Trip sections"
          className="relative shrink flex items-center h-14"
          style={PILL_GLASS}
        >
          <TabsHighlight
            className="rounded-full"
            transition={{ type: "spring", stiffness: 250, damping: 27 }}
            style={{
              top: 6,
              bottom: 6,
              insetInlineStart: 3,
              insetInlineEnd: 3,
              background: "var(--tab-thumb-bg)",
              boxShadow: "var(--tab-thumb-shadow)",
            }}
          >
            <TabsList className="flex items-center w-full h-full">
              {tabs.map((tab, i) => {
                const Icon = tab.icon;
                const active = i === activeIndex;
                return (
                  <TabsHighlightItem key={tab.key} value={tab.key} className="flex-1 h-full min-w-0">
                    <Link
                      href={tab.href}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      className="flex flex-col items-center justify-center gap-0.5 h-full w-full min-w-0"
                    >
                      {/* Icon morph at phase boundary: keyed crossfade. */}
                      <span key={`${tab.key}-${phase}`} style={{ animation: "fadeIn 200ms ease" }}>
                        <Icon
                          size={20}
                          className={active ? "text-foreground" : "text-tertiary"}
                          strokeWidth={active ? 2.5 : 2}
                        />
                      </span>
                      <span
                        className={`truncate max-w-full px-1 ${active ? "text-foreground" : "text-tertiary"}`}
                        style={{ fontSize: "clamp(10px, 3vw, 12px)", fontWeight: 600 }}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  </TabsHighlightItem>
                );
              })}
            </TabsList>
          </TabsHighlight>
        </Tabs>

        {/* RIGHT — [+] circle. Tap = phase default; long-press = full sheet. */}
        <button
          type="button"
          onClick={onPlusClick}
          onPointerDown={onPlusDown}
          onPointerUp={onPlusUp}
          onPointerCancel={onPlusCancel}
          onPointerLeave={onPlusCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={right.label}
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-95"
          style={
            right.accent
              ? { background: "var(--clr-brand)", boxShadow: "0 4px 20px var(--clr-brand-dim)", pointerEvents: "auto" }
              : { ...CIRCLE_GLASS }
          }
        >
          <span key={`right-${right.label}-${phase}`} style={{ animation: "fadeIn 200ms ease" }}>
            <right.icon size={20} className={right.accent ? "text-white" : "text-foreground"} />
          </span>
        </button>
      </div>

      {/* Full Add sheet — the long-press target; also the PLANNING/DEPARTURE
          tap default. DEPARTURE puts the pack row first (§3-A table). */}
      <BottomSheet open={plusOpen} onClose={() => setPlusOpen(false)} title={t("nav.addTitle")} size="sm">
        <div className="divide-y divide-border/60">
          {/* Sprint 4: every row produces something in ≤2 taps. The AI stub
              is gone (audit FIX-1 — no toast, no promise); pack opens a real
              composer (FIX-4); expenses are phase-aware (FIX-3: pre-trip you
              TYPE a deposit, on the ground you photograph a bill); Share
              dispatches the crew-sheet event every trip route listens for
              (FIX-2 — paxawa:shareTrip only had a LIVE listener); documents
              get their first entry point (FIX-5a). */}
          {phase === "DEPARTURE" && (
            <ActionRow icon={Luggage} label={t("nav.addPackItem")} onClick={() => { setPlusOpen(false); setPackOpen(true); }} />
          )}
          <ActionRow icon={MapPin} label={t("nav.addPlace")} onClick={() => { setPlusOpen(false); setAddPlaceOpen(true); }} />
          <ActionRow
            icon={Wallet}
            label={t("now.logExpense")}
            onClick={() => {
              setPlusOpen(false);
              router.push(phase === "PLANNING" ? `${base}/money?add=expense` : `${base}/money/expense-camera`);
            }}
          />
          <ActionRow icon={FileText} label={t("nav.addDocument")} onClick={() => { setPlusOpen(false); setDocOpen(true); }} />
          {phase !== "DEPARTURE" && (
            <ActionRow icon={Luggage} label={t("nav.addPackItem")} onClick={() => { setPlusOpen(false); setPackOpen(true); }} />
          )}
          <ActionRow icon={Users} label={t("nav.askCrew")} onClick={() => { setPlusOpen(false); router.push(`${base}/huddle?compose=poll`); }} />
          <ActionRow icon={Share2} label={t("nav.shareTrip")} onClick={() => { setPlusOpen(false); dispatch("paxawa:openCrewSheet"); }} />
          <ActionRow icon={CalendarDays} label={t("nav.setBudget")} onClick={() => { setPlusOpen(false); setBudgetOpen(true); }} />
        </div>
      </BottomSheet>

      <AddPlaceSearch
        open={addPlaceOpen}
        onClose={() => setAddPlaceOpen(false)}
        tripId={tripId}
        destination={destination}
        destinationCenter={null}
        days={days}
        defaultDay={defaultDay}
      />
      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} tripId={tripId} currency={currency} total={budgetTotal} />
      {/* Sprint 4 FIX-4: inline pack composer — no page redirect. */}
      <PackItemComposer open={packOpen} onClose={() => setPackOpen(false)} tripId={tripId} />
      {/* Sprint 4 FIX-5a: the documents entry point (controlled mode). */}
      <AddDocumentDialog tripId={tripId} open={docOpen} onClose={() => setDocOpen(false)} />
    </div>
  );
}

/**
 * Sprint 4 FIX-4 — quick pack-item composer. The + menu's pack row used to
 * redirect to /pack (a nav shortcut, not a quick-add); this submits a real
 * item without leaving the current screen.
 */
function PackItemComposer({ open, onClose, tripId }: { open: boolean; onClose: () => void; tripId: string }) {
  const t = useT();
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"shared" | "mine">("mine");
  const [pending, setPending] = useState(false);

  async function submit() {
    const trimmed = label.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("tripId", tripId);
      fd.set("label", trimmed);
      fd.set("scope", scope);
      await createPackingItem(fd);
      toast.success(`${trimmed} ✓`);
      setLabel("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that");
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("nav.addPackItem")} size="sm">
      <div className="flex flex-col gap-3 pb-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={t("pack.itemPlaceholder")}
          autoFocus
          className="h-12 rounded-2xl border border-border bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={`h-10 rounded-xl text-xs font-bold border transition-all ${scope === "mine" ? "bg-primary/10 border-primary/30 text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {t("pack.mine")}
          </button>
          <button
            type="button"
            onClick={() => setScope("shared")}
            className={`h-10 rounded-xl text-xs font-bold border transition-all ${scope === "shared" ? "bg-primary/10 border-primary/30 text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {t("pack.shared")}
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !label.trim()}
          className="h-12 rounded-2xl bg-primary text-white font-bold text-[15px] disabled:opacity-50"
        >
          {t("pack.add")}
        </button>
      </div>
    </BottomSheet>
  );
}

function ActionRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 h-14 px-1 text-start active:bg-muted/40 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </span>
      <span className="flex-1 font-semibold text-[15px]">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
    </button>
  );
}
