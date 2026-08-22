"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Compass, Plus, MapPin, CaretRight as ChevronRight, Users, CalendarDots as CalendarDays, Sparkle as Sparkles, Wallet, ShareNetwork as Share2, AirplaneTakeoff as PlaneTakeoff, NavigationArrow as Navigation, Image as ImageIcon, HandCoins, MagnifyingGlass as Search, Suitcase as Luggage, FileText, X } from "@phosphor-icons/react/dist/ssr";
import type { Icon as LucideIcon } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Tabs,
  TabsList,
  TabsHighlight,
  TabsHighlightItem,
} from "@/components/animate-ui/primitives/animate/tabs";
import { AddPlaceSearch } from "@/components/itinerary/add-place-search";
import { AddDocumentDialog } from "@/components/documents/add-document-dialog";
import { AddConfirmationSheet } from "@/components/confirmations/add-confirmation-sheet";
import { Ticket } from "@phosphor-icons/react/dist/ssr";
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
/* Sprint 6 FIX-3 — Figma pill nav (node 2002:192): three same-height
 * floating glass elements. Values from the design:
 *   glass  — light rgba(255,255,255,0.46) · dark rgba(10,10,10,0.46)
 *   chip   — light rgba(0,0,0,0.03)       · dark rgba(0,0,0,0.10)
 *   action — rgba(163,149,255,0.50) + 1.6px white border (both themes)
 * backdropFilter stays INLINE (Lightning CSS strips it from stylesheets). */
/* Sprint 7C rev2 — exact Figma (4EUYzPzh8Uo357Ep7FccGk/100:175, detail
 * pass). blur(10px) on wrappers (chip 20), semi-transparent tint-matched
 * hairlines, soft drop shadows, tight metrics: circle pad via --nav-pad
 * (18px light / 16px dark), pill pad 2px, tabs 6px 8px with 2px gap and
 * 10px/14px labels. Deviations, both deliberate: the pill is flex:1 in
 * BOTH modes (the brief's own root-cause #4; its dark-mode fixed 225px is
 * a Figma frame artifact) and the dark active chip's 30px side padding is
 * skipped (tabs are equal-width flex:1 — extra padding would skew them).
 * backdropFilter stays INLINE — Lightning CSS strips classes/stylesheets. */
const NAV_SHADOW = "0px 0px 6px 0px rgba(0,0,0,0.05), 0px 1px 4px 0px rgba(0,0,0,0.1)";
/* Sprint 9 Part 2: the same nav serves every width — the 280px desktop
 * sidebar is gone. ≥768px the three elements scale up slightly (same
 * proportions, same material); sizing lives in these frame builders
 * because the glass MUST stay inline (Lightning CSS strips it). */
/* The circles carry a visible label under the icon (see NavCircleContent).
   Size is pinned to what the old padding produced — 2 x --nav-pad + a 24px
   icon — so the glass keeps its exact previous diameter in both themes and
   stays a circle rather than stretching into an oval around the text. The
   icon shrinks 24 -> 20 to make room; the label reuses the tab type scale. */
const CIRCLE_SIZE = "calc(var(--nav-pad) * 2 + 24px)";
const circleFrame = (desktop: boolean) => ({
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  background: "var(--nav-glass)",
  border: "1px solid var(--nav-border)",
  borderRadius: 9999,
  padding: 0,
  width: desktop ? 62 : CIRCLE_SIZE,
  height: desktop ? 62 : CIRCLE_SIZE,
  boxShadow: NAV_SHADOW,
  pointerEvents: "auto" as const,
});
const pillFrame = () => ({
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  background: "var(--nav-glass)",
  border: "1px solid var(--nav-border)",
  borderRadius: 9999,
  padding: 2,
  boxShadow: NAV_SHADOW,
  pointerEvents: "auto" as const,
});
/* Design-system Step 2: one purple — solid brand-primary (was the
 * off-token rgba(163,149,255,0.80) lavender + tinted border). */
const brandFrame = (desktop: boolean) => ({
  background: "var(--clr-brand)",
  borderRadius: 9999,
  padding: 0,
  width: desktop ? 62 : 56,
  height: desktop ? 62 : 56,
  boxShadow: NAV_SHADOW,
  pointerEvents: "auto" as const,
});
interface Tab { key: string; label: string; icon: LucideIcon; href: string }

export function DynamicBottomNav({
  tripId,
  destination = "",
  days = [],
  startDate,
  endDate,
  inboundAddress = null,
  currency = "USD",
  budgetTotal = null,
  todayIso,
}: {
  tripId: string;
  destination?: string;
  days?: string[];
  startDate: string;
  endDate: string;
  inboundAddress?: string | null;
  currency?: string;
  budgetTotal?: number | null;
  /**
   * fix/tz: today, from the server, in the traveller's zone. This component
   * recomputed the phase with `new Date()` — so a Los Angeles traveller at
   * 18:00 got server HTML reading "Today · Nearby · Money" and a hydrated nav
   * reading "Now · Pack · Discover": different labels, different icons and
   * different hrefs, silently, every evening.
   */
  todayIso: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const base = `/trips/${tripId}`;
  const phase: TripPhase = tripPhase({ startDate, endDate }, todayIso);

  const [plusOpen, setPlusOpen] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  // Sprint 4 FIX-5a: the document composer owned by the + menu.
  const [docOpen, setDocOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // A+B: every import entry routes to the journey page. Legacy ?import=
  // deep links (old bookmarks) forward there too.
  const searchParams = useSearchParams();
  useEffect(() => {
    const imp = searchParams.get("import");
    if (imp == null) return;
    router.replace(`${base}/import${imp !== "1" ? `?text=${encodeURIComponent(imp)}` : ""}`);
  }, [searchParams, router, base]);
  useEffect(() => {
    const open = () => router.push(`${base}/import`);
    window.addEventListener("paxawa:openInspire", open);
    return () => window.removeEventListener("paxawa:openInspire", open);
  }, [router, base]);
  // Now-redesign step 1: any surface can open the confirmation sheet by event
  // (trip home "Add a confirmation", empty Day 1, docs tab).
  useEffect(() => {
    const open = () => setConfirmOpen(true);
    window.addEventListener("paxawa:openConfirmation", open);
    return () => window.removeEventListener("paxawa:openConfirmation", open);
  }, []);
  // Sprint 9 Part 2: ≥768px the nav scales up (frame padding + label size
  // are inline styles, so a media query can't reach them).
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [budgetOpen, setBudgetOpen] = useState(false);

  // Sprint 7 FIX-2 — the exact tab table:
  //   PLANNING  Now · Discover · Money
  //   LIVE      Today · Nearby · Money
  //   DEPARTURE Now · Pack · Discover
  //   RECAP     Now · Money (two tabs; the pill shrinks)
  const nowTab: Tab = {
    key: "now",
    label: phase === "LIVE" ? t("nav.today") : t("nav.now"),
    icon: phase === "LIVE" ? Navigation : phase === "DEPARTURE" ? PlaneTakeoff : phase === "RECAP" ? Sparkles : MapPin,
    href: base,
  };
  const discoverTab: Tab = {
    key: "discover",
    label: phase === "LIVE" ? t("nav.nearby") : t("nav.discover"),
    icon: Compass,
    href: `${base}/discover`,
  };
  const moneyTab: Tab = { key: "money", label: t("nav.money"), icon: Wallet, href: `${base}/money` };
  const packTab: Tab = { key: "pack", label: t("nav.pack"), icon: Luggage, href: `${base}/pack` };
  const tabs: Tab[] =
    phase === "RECAP"
      ? [nowTab, moneyTab]
      : phase === "DEPARTURE"
        ? [nowTab, packTab, discoverTab]
        : [nowTab, discoverTab, moneyTab];

  // Active tab = longest matching href; money-era routes count as Money.
  // No match (e.g. /members) → no chip.
  const moneyish = /^\/trips\/[^/]+\/(money|expenses|wallet)/.test(pathname);
  const activeKey = (() => {
    const match = [...tabs]
      .sort((a, b) => b.href.length - a.href.length)
      .find((tab) => (tab.href === base ? pathname === base : pathname.startsWith(tab.href)));
    if (match) return match.key;
    if (moneyish && tabs.some((tab) => tab.key === "money")) return "money";
    return "";
  })();

  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? "";

  // [+] behavior: single tap = phase default; long-press 400ms = full sheet.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function onPlusDown() {
    longPressed.current = false;
    // Sprint 7 FIX-3: long-press ALWAYS opens the + menu, on every screen.
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

  // Sprint 7 FIX-3 — route flags drive both circles (screen-based, not
  // tab-based: /money in DEPARTURE has no Money tab but is still Money).
  const isPackPage = pathname === `${base}/pack`;
  const isMoneyPage = moneyish;
  const isDiscoverPage = pathname.startsWith(`${base}/discover`);
  const isItineraryPage = pathname.startsWith(`${base}/itinerary`);
  const [packInputOpen, setPackInputOpen] = useState(false);
  useEffect(() => setPackInputOpen(false), [pathname]);
  function togglePackInput() {
    setPackInputOpen((cur) => {
      dispatch(cur ? "pack:blurAdd" : "pack:focusAdd");
      return !cur;
    });
  }

  // LEFT circle — one job, one name: the itinerary. It used to flip to a
  // House pointing at the trip root while you were on the itinerary, which
  // was harmless as a bare glyph but became a visible duplicate once the
  // circles carried labels: "Now" on the circle, "Now" on the tab beside it,
  // both going to the same screen. The circle now always reads "Plan" and
  // takes the active-chip background on the itinerary, exactly like a
  // selected tab; the trip root is one control to its right.
  const left: { icon: LucideIcon; label: string; action: () => void } = {
    icon: CalendarDays,
    label: t("nav.itinerary"),
    action: () => router.push(`${base}/itinerary`),
  };

  // RIGHT circle — the Sprint 7 scenario table. Long-press (below) always
  // opens the + menu regardless of screen.
  const right: { icon: LucideIcon; accent: boolean; label: string; action: () => void } = isPackPage
    ? {
        icon: packInputOpen ? X : Plus,
        accent: true,
        label: packInputOpen ? t("common.close") : t("pack.add"),
        action: togglePackInput,
      }
    : isDiscoverPage
    ? { icon: Search, accent: false, label: t("nav.search"), action: () => dispatch("discover:toggleSearch") }
    : isMoneyPage
      ? {
          // Video round 3: the camera-first path asked for a permission people
          // decline ("no need to ask for a camera") — the typed form is the
          // entry everywhere; the receipt photo is a field inside it.
          icon: Plus,
          accent: true,
          label: t("nav.add"),
          action: () => dispatch("paxawa:logExpense"),
        }
      : isItineraryPage
        // Sprint 8 Item 3: opens the itinerary's add-actions sheet
        // (place/note/time block/expense/document), not just add-place.
        ? { icon: Plus, accent: true, label: t("nav.add"), action: () => dispatch("paxawa:addStop") }
        : { icon: Plus, accent: true, label: t("nav.add"), action: () => setPlusOpen(true) };

  return (
    <div>
      {/* Sprint 6 FIX-3 Layer A: content fades into the page background just
          above the nav, so lists scroll UNDER it instead of smashing against
          the edge. Purely visual (pointer-events none, z-39 under the z-40
          nav); var(--background) keeps both themes correct. The nav's glass
          itself (Layer B) is the existing inline backdropFilter + the
          semi-transparent --pill-bg tokens. */}
      {!isDiscoverPage && (
      <div
        aria-hidden
        className="fixed inset-x-0 z-[39]"
        style={{
          bottom: 0,
          height: 120,
          background: "linear-gradient(to bottom, transparent, var(--background))",
          pointerEvents: "none",
        }}
      />
      )}
      {/* Sprint 6 FIX-3 — Figma pill nav: [home 56] [12] [pill flex] [12]
          [action 56], all same height, separate floating glass elements. */}
      <div
        data-bottom-nav
        className="fixed inset-x-0 z-40 flex items-center justify-center gap-2"
        style={{ bottom: "env(safe-area-inset-bottom)", padding: "12px 16px", pointerEvents: "none" }}
      >
        {/* LEFT — itinerary shortcut (Sprint 7 FIX-3); on the itinerary it
            flips home to the cockpit. Extended-backdrop glass (FIX-4). */}
        <button
          type="button"
          onClick={left.action}
          aria-label={left.label}
          className="relative flex flex-col items-center justify-center gap-0.5 shrink-0 active:scale-95"
          aria-current={isItineraryPage ? "page" : undefined}
          style={{ ...circleFrame(desktop), ...(isItineraryPage ? { background: "var(--nav-chip)" } : {}) }}
        >
          {/* The label is the point: this circle is how you reach the
              itinerary, and for a first-timer an unlabelled calendar glyph
              named nothing. The three pill tabs were labelled; the two
              circles — the ones whose meaning CHANGES with the screen —
              were not. */}
          <span
            key={`left-${left.label}`}
            className="relative flex flex-col items-center gap-px"
            style={{ animation: "fadeIn 200ms ease" }}
          >
            {/* Video round 4: same active language as the pill tabs — brand
                colour + filled glyph. */}
            <left.icon size={20} weight={isItineraryPage ? "fill" : "regular"} className={isItineraryPage ? "" : "text-foreground"} style={isItineraryPage ? { color: "var(--clr-brand)" } : undefined} />
            <span className={`text-[10px] font-bold leading-none whitespace-nowrap ${isItineraryPage ? "" : "text-foreground"}`} style={isItineraryPage ? { color: "var(--clr-brand)" } : undefined}>
              {left.label}
            </span>
          </span>
        </button>

        {/* CENTER pill — equal-width tabs, icon over label. The Animate UI
            highlight is the active chip (rgba black at 3%/10% per theme);
            active icon is the filled variant (fill=currentColor). */}
        <Tabs
          value={activeKey}
          aria-label="Trip sections"
          className="relative flex-1 min-w-0 max-w-[420px] md:max-w-[560px] flex items-center"
          style={pillFrame()}
        >
          <TabsHighlight
            className="rounded-full"
            transition={{ type: "spring", stiffness: 250, damping: 27 }}
            style={{
              inset: 0,
              background: "var(--nav-chip)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <TabsList className="flex items-center w-full">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeKey;
                return (
                  <TabsHighlightItem key={tab.key} value={tab.key} className="flex-1 min-w-0">
                    <Link
                      href={tab.href}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      /* padding via classes: HighlightItem clones this Link
                         and REPLACES its style prop (position/zIndex), so
                         inline styles here never render. */
                      className="flex flex-col items-center justify-center gap-0.5 w-full min-w-0 px-2 py-1.5 md:px-4 md:py-2"
                    >
                      {/* Icon morph at phase boundary: keyed crossfade.
                          flex: an inline span line-boxes the 24px svg down
                          to ~17px and shrinks the whole pill. */}
                      <span key={`${tab.key}-${phase}`} className="flex" style={{ animation: "fadeIn 200ms ease" }}>
                        {/* Phosphor weight prop: fill = active, regular = inactive —
                            the reason for the icon-library switch. */}
                        <Icon
                          size={24}
                          className={active ? "" : "text-foreground"}
                          style={active ? { color: "var(--clr-brand)" } : undefined}
                          weight={active ? "fill" : "regular"}
                        />
                      </span>
                      <span
                        className={`truncate max-w-full ${active ? "" : "text-foreground"}`}
                        style={{ fontSize: desktop ? 12 : 10, lineHeight: desktop ? "16px" : "14px", fontWeight: active ? 700 : 400, color: active ? "var(--clr-brand)" : undefined }}
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

        {/* RIGHT — action circle: brand at 50% + white border (Figma), the
            contextual action unchanged (menu / camera / search / pack X). */}
        <button
          type="button"
          onClick={onPlusClick}
          onPointerDown={onPlusDown}
          onPointerUp={onPlusUp}
          onPointerCancel={onPlusCancel}
          onPointerLeave={onPlusCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={right.label}
          className="relative flex flex-col items-center justify-center shrink-0 active:scale-95"
          style={brandFrame(desktop)}
        >
          {/* Same treatment as the left circle. This one's meaning shifts the
              most of anything in the nav — Add / Search / Camera / Close by
              screen and phase — so it needs the label most. */}
          <span
            key={`right-${right.label}-${phase}`}
            className="relative flex flex-col items-center gap-px"
            style={{ animation: "fadeIn 200ms ease" }}
          >
            <right.icon size={20} className="text-primary-foreground" />
            <span className="text-[10px] font-bold leading-none text-primary-foreground whitespace-nowrap">
              {right.label}
            </span>
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
          <ActionRow icon={MapPin} label={t("nav.addPlace")} onClick={() => { setPlusOpen(false); setAddPlaceOpen(true); }} />
          <ActionRow icon={Sparkles} label={t("inspire.entry")} onClick={() => { setPlusOpen(false); router.push(`${base}/import`); }} />
          <ActionRow
            icon={Wallet}
            label={t("now.logExpense")}
            onClick={() => {
              setPlusOpen(false);
              router.push(`${base}/money?add=expense`);
            }}
          />
          <ActionRow icon={Ticket} label={t("confirm.title")} onClick={() => { setPlusOpen(false); setConfirmOpen(true); }} />
          <ActionRow icon={FileText} label={t("nav.addDocument")} onClick={() => { setPlusOpen(false); setDocOpen(true); }} />
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
      {/* Sprint 4 FIX-5a: the documents entry point (controlled mode). */}
      <AddDocumentDialog tripId={tripId} open={docOpen} onClose={() => setDocOpen(false)} />
      <AddConfirmationSheet tripId={tripId} tripStart={startDate} tripEnd={endDate} inboundAddress={inboundAddress} open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </div>
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
