"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CaretLeft as ChevronLeft, ChatCircle as MessageCircle } from "@phosphor-icons/react/dist/ssr";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { parseDateOnly } from "@/lib/date-only";
import { toIsoDay } from "@/lib/today";
import { eachDayOfInterval, format as isoFmt } from "date-fns";
import { DynamicBottomNav } from "@/components/navigation/dynamic-bottom-nav";
import { AccountAvatarButton } from "@/components/account/account-avatar-button";
import { ShareTripSheet, type CrewMember } from "@/components/trips/share-trip-sheet";
import { AvatarGroup, AvatarGroupTooltip } from "@/components/animate-ui/components/animate/avatar-group";
import { useT } from "@/components/i18n/locale-provider";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  shareToken?: string | null;
  currency: string;
  budgetTotal: number | null;
}

interface Props {
  trip: Trip;
  userId: string;
  isOwner: boolean;
  /** Phase 7 §4: crew for the header avatar stack + Crew sheet. */
  crew?: CrewMember[];
  /**
   * fix/tz: today ("YYYY-MM-DD") as the server resolved it in the traveller's
   * zone. The shell and the nav must not compute this themselves — the nav
   * derives its tab set, its labels, its icons AND its hrefs from the phase, so
   * a client that disagrees with the server swaps all four on hydration.
   */
  todayIso: string;
  /** forward-the-email address for this trip (null when inbound isn't configured) */
  inboundAddress?: string | null;
  children: React.ReactNode;
}

/**
 * Reinvention shell (redesign brief §2). A single thin top bar + the three-mode
 * bottom tab bar at every width (Sprint 9 Part 2: the 280px desktop
 * sidebar is gone — desktop gets the same glass pill nav, scaled up). The old
 * multi-tab sidebar, mobile floating nav, chat side-panel, crew sheet, tools
 * sheet, notification bell and keyboard-shortcut layer are all gone — chat is a
 * full page reached by route, crew/sharing live in Settings.
 *
 * Top bar: left = trip name on a mode root, a back arrow on any deeper view;
 * right = avatar → account menu. Titles are left-aligned; no centered titles,
 * no hamburger, no drawer.
 */
export function TripShell({ trip, isOwner, crew = [], todayIso, inboundAddress = null, children }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  // Phase 7 §4: Crew sheet — header stack + the nav's left circle both open it.
  const [crewOpen, setCrewOpen] = useState(false);
  // Mode roots = the trip home + the pages the bottom nav can land on.
  // Anything deeper shows Back instead of "All trips".
  const isDeepRoute = (() => {
    const rest = (pathname ?? "").split(`/trips/${trip.id}`)[1] ?? "";
    const segs = rest.split("/").filter(Boolean);
    if (segs.length === 0) return false;
    if (segs.length > 1) return true;
    return !["itinerary", "discover", "money", "bookings"].includes(segs[0]);
  })();
  useEffect(() => {
    const open = () => setCrewOpen(true);
    window.addEventListener("paxawa:openCrewSheet", open);
    return () => window.removeEventListener("paxawa:openCrewSheet", open);
  }, []);
  // Sprint 7 FIX-1: Huddle lives in the header with an unread dot. Reuses
  // the nav's old badge logic (open decisions without the user's reaction);
  // visiting Huddle stamps a per-trip "seen" time so the dot clears until
  // something newer lands.
  const [huddleUnread, setHuddleUnread] = useState(false);
  const seenKey = `paxawa-huddle-seen:${trip.id}`;
  useEffect(() => {
    if (pathname.startsWith(`${base}/huddle`)) {
      try { localStorage.setItem(seenKey, new Date().toISOString()); } catch {}
      setHuddleUnread(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: open } = await supabase
          .from("huddle_decisions")
          .select("id, created_at")
          .eq("trip_id", trip.id)
          .eq("status", "open");
        if (!open || open.length === 0 || cancelled) { setHuddleUnread(false); return; }
        const { data: mine } = await supabase
          .from("decision_reactions")
          .select("decision_id")
          .eq("user_id", user.id)
          .in("decision_id", open.map((d) => d.id));
        if (cancelled) return;
        const reacted = new Set((mine ?? []).map((r) => r.decision_id));
        let seen = 0;
        try { seen = Date.parse(localStorage.getItem(seenKey) ?? "") || 0; } catch {}
        setHuddleUnread(
          open.some((d) => !reacted.has(d.id) && Date.parse(d.created_at as string) > seen),
        );
      } catch {
        /* the dot is decoration — never break the header over it */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, trip.id]);

  const [profile, setProfile] = useState<{ name: string; avatarUrl: string | null; email: string | null }>({
    name: "",
    avatarUrl: null,
    email: null,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile({
        // §0-A: displayName first, then the email local-part — never the raw
        // email, never a username slug.
        name: data?.display_name ?? user.email?.split("@")[0] ?? "",
        avatarUrl: data?.avatar_url ?? null,
        email: user.email ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const base = `/trips/${trip.id}`;
  // Immersive screens have no shell top bar and fill the viewport: Discover
  // (Screen D) and the NOW cockpit (Screen C, the trip root — full-screen map
  // + its own draggable sheet). They carry their own controls.
  // fix/tz: a calendar-day comparison rather than local-midnight-vs-instant.
  // HONEST NOTE: this value currently has no consumers — it was already dead on
  // main (eslint flags it as unused there too). Converted for consistency so it
  // is not a landmine if someone wires it up, NOT because it fixes a live bug.
  // Left in place rather than deleted, per the "don't remove apparently-dead
  // code" rule in AGENTS.md.
  const started = toIsoDay(trip.startDate) <= todayIso;
  // Day list for the nav's "Add place to today" sub-sheet (Fix 5).
  const navDays = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => isoFmt(d, "yyyy-MM-dd"));
  const isDiscover = pathname.startsWith(`${base}/discover`);
  const immersive = pathname === base || isDiscover;
  // Phase 6 §0 rule 13: per-route `dark` forcing (the old darkChrome flag) is
  // DELETED. The whole app is dark-first via next-themes on <html>
  // (storageKey "paxawa-theme"); every route follows the global tokens and
  // the light toggle flips everything, body background included.

  return (
    <div className="min-h-svh flex flex-col bg-background text-foreground">

      <div className="flex flex-col min-h-svh">
        {/* Phase 7 §4: THE standard trip header — every trip route, no
            exceptions. 56px sticky, blur inline (§0 rule 1).
            Phase 7 §1: "← All trips" is a DIRECT jump to /dashboard — never
            history back, never useSmartBack. */}
        <header
          className="shrink-0 flex items-center gap-2 px-2 border-b border-border sticky top-0 z-50"
          style={{
            height: "calc(56px + env(safe-area-inset-top))",
            paddingTop: "env(safe-area-inset-top)",
            background: "var(--sheet-bg)",
            backdropFilter: "blur(10px) saturate(180%)",
            WebkitBackdropFilter: "blur(10px) saturate(180%)",
          }}
        >
          {isDeepRoute ? (
            /* Video round 3: inside something that is not a main tab (Huddle,
               Pack, Settings, camera…) the header offers BACK — "All trips"
               threw people out of the trip. Roots keep the direct jump. */
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) router.back();
                else router.push(`/trips/${trip.id}`);
              }}
              className="shrink-0 flex items-center h-11 ps-1 pe-2 text-foreground active:opacity-70"
              aria-label={t("common.back")}
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              <span className="text-[13px] font-semibold hidden min-[380px]:inline">{t("common.back")}</span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="shrink-0 flex items-center h-11 ps-1 pe-2 text-foreground active:opacity-70"
              aria-label="All trips"
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              <span className="text-[13px] font-semibold hidden min-[380px]:inline">{t("nav.allTrips")}</span>
            </Link>
          )}
          <p className="flex-1 min-w-0 text-center font-bold text-[15px] truncate">{trip.name}</p>

          {/* Crew avatar stack (3 max) → Crew sheet. Brief F: Animate UI
              AvatarGroup — avatars spring forward on hover/tap, tooltip names.
              (div+role, not <button>: the group renders divs inside.) */}
          {crew.length > 1 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setCrewOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCrewOpen(true); }}
              aria-label="Crew"
              className="shrink-0 flex items-center h-11 px-1 cursor-pointer"
            >
              <AvatarGroup className="h-11 -space-x-2 rtl:space-x-reverse" translate="-30%" side="bottom">
                {crew.slice(0, 3).map((m) => (
                  <span key={m.userId} className="inline-flex rounded-full ring-2 ring-background">
                    <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} seed={m.userId} size="xs" />
                    <AvatarGroupTooltip>{m.displayName}</AvatarGroupTooltip>
                  </span>
                ))}
              </AvatarGroup>
            </div>
          )}

          {/* Sprint 7 FIX-1: Huddle is an inbox — it lives up here, left of
              the profile, with a brand dot when something needs the user. */}
          <Link
            href={`${base}/huddle`}
            aria-label="Huddle"
            className="relative shrink-0 w-11 h-11 flex items-center justify-center text-foreground active:opacity-70"
          >
            <MessageCircle className="w-[22px] h-[22px]" />
            {huddleUnread && (
              <span
                aria-hidden
                className="absolute top-2 end-2 w-2.5 h-2.5 rounded-full ring-2 ring-background"
                style={{ background: "var(--clr-brand)" }}
              />
            )}
          </Link>

          {/* User avatar → Account sheet at EVERY width. The old desktop
              dropdown (hardcoded English, no language entry) is retired —
              the sheet is the one account surface, fully localized, with
              the language switcher. Trip settings (its only unique item)
              rides along as an owner-only sheet row. */}
          <div className="shrink-0">
            <AccountAvatarButton
              size={36}
              borderColor="var(--clr-brand)"
              tripSettingsHref={isOwner ? `${base}/settings` : null}
            />
          </div>
        </header>

        {/* Screen content. Bottom padding clears the fixed tab bar on mobile;
            the desktop sidebar handles its own offset above. Immersive routes
            (cockpit map, Discover stream) manage their own clearance. */}
        <main className={immersive ? "flex-1 min-w-0" : "flex-1 min-w-0 pb-[calc(80px+env(safe-area-inset-bottom))]"}>
          {children}
        </main>

        {/* Phase 7 §4: the Crew sheet behind the header avatar stack (also
            opened by the nav's left circle via paxawa:openCrewSheet). */}
        <ShareTripSheet
          open={crewOpen}
          onClose={() => setCrewOpen(false)}
          tripId={trip.id}
          tripName={trip.name}
          crew={crew}
        />

        <DynamicBottomNav
          tripId={trip.id}
          destination={trip.destination}
          days={navDays}
          startDate={trip.startDate}
          endDate={trip.endDate}
          currency={trip.currency}
          budgetTotal={trip.budgetTotal}
          todayIso={todayIso}
          inboundAddress={inboundAddress}
        />
      </div>
    </div>
  );
}
