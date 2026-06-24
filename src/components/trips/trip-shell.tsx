"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Bell,
  LogOut,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  MessageSquare,
  Share2,
  Check,
  Copy,
  Keyboard,
  CalendarPlus,
  Sun,
  Moon,
  Monitor,
  UserCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TripMoreSheet } from "@/components/trips/trip-more-sheet";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import dynamicImport from "next/dynamic";
import { MobileNav } from "@/components/pwa/mobile-nav";
import { EnablePushButton } from "@/components/pwa/enable-push";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useT } from "@/components/i18n/locale-provider";

// Lazy load the heavy components that aren't needed at first paint:
//   - ChatSidebar pulls in supabase realtime + motion + the AI chip
//     fetcher; ~50KB of JS that only matters once the chat opens.
//   - SidePanel + CrewSheetContent only render when the user opens
//     the Crew sheet from the toolbar.
//   - InstallPrompt waits for `beforeinstallprompt`, can absolutely defer.
// All three drop the trip-shell initial bundle so tab clicks feel snappier.
const ChatSidebar = dynamicImport(
  () => import("@/components/chat/chat-sidebar").then((m) => ({ default: m.ChatSidebar })),
  { ssr: false },
);
const SidePanel = dynamicImport(
  () => import("@/components/ui/side-panel").then((m) => ({ default: m.SidePanel })),
  { ssr: false },
);
const InstallPrompt = dynamicImport(
  () => import("@/components/pwa/install-prompt").then((m) => ({ default: m.InstallPrompt })),
  { ssr: false },
);
import { KeyboardShortcuts } from "@/components/trips/keyboard-shortcuts";
import { Logo } from "@/components/ui/logo";
import { DesktopTripSidebar } from "@/components/trips/desktop-trip-sidebar";

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  shareToken?: string | null;
}

interface Props {
  trip: Trip;
  userId: string;
  /** B3-a: owners get a Settings button in the header (out of the
   *  dropdown). Members still don't see it — server already redirects. */
  isOwner: boolean;
  children: React.ReactNode;
}

// P0-2: the desktop/tablet sub-nav tab list lived here. It's gone — the
// left sidebar (lg+) and the bottom MobileNav (<lg) are now the only
// primary nav surfaces, one per breakpoint. NAV_TABS is removed; the
// sidebar owns its own canonical list (desktop-trip-sidebar.tsx).

export function TripShell({ trip, isOwner, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  void searchParams;
  const t = useT();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [chatOpen, setChatOpen] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  // B19: load the signed-in user's avatar so the dropdown trigger shows
  // a personal touch instead of the generic "Me" label.
  const [myProfile, setMyProfile] = useState<{ displayName: string; avatarUrl: string | null }>({
    displayName: "",
    avatarUrl: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setMyProfile({
        displayName: profile?.display_name ?? user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Persist desktop chat-open state per trip. Mobile is always closed
  // by default (it's a fullscreen overlay so opening on landing is jarring).
  const chatPrefKey = `paxawa:chat-open:${trip.id}`;
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 639px)").matches) return;
    try {
      const v = localStorage.getItem(chatPrefKey);
      if (v === "1") setChatOpen(true);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 639px)").matches) return;
    try {
      localStorage.setItem(chatPrefKey, chatOpen ? "1" : "0");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, trip.id]);

  // ── Live badge counts ────────────────────────────────────────────────────
  // Mirrors the mobile app: small red pill on each tab in the floating nav
  // showing unread / pending / unsettled counts.
  const [badges, setBadges] = useState<{
    chat: number; itinerary: number; expenses: number; decisions: number;
  }>({ chat: 0, itinerary: 0, expenses: 0, decisions: 0 });

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId || !trip.id) return;

        const lastReadKey = `chat-last-read:${userId}:${trip.id}`;
        const lastRead = parseInt(localStorage.getItem(lastReadKey) ?? "0", 10);

        const [chatRes, itinRes, splitsRes, decisionsRes] = await Promise.all([
          supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("trip_id", trip.id)
            .neq("user_id", userId)
            .gt("created_at", new Date(lastRead).toISOString()),
          supabase
            .from("itinerary_items")
            .select("id", { count: "exact", head: true })
            .eq("trip_id", trip.id)
            .eq("status", "proposed"),
          supabase
            .from("expense_splits")
            .select("id, expense:expenses!inner(trip_id, paid_by)", { count: "exact", head: false })
            .eq("user_id", userId)
            .eq("settled", false)
            .filter("expense.trip_id", "eq", trip.id)
            .neq("expense.paid_by", userId),
          // v2 decisions: open cards this user hasn't voted on yet. Small set
          // (RLS-gated to trip members), so we pull the votes maps and count
          // client-side rather than reach for a jsonb-key filter.
          supabase
            .from("decisions")
            .select("votes")
            .eq("trip_id", trip.id)
            .eq("status", "open"),
        ]);

        if (cancelled) return;
        const needsVote =
          (decisionsRes.data ?? []).filter((d) => {
            const v = (d.votes ?? {}) as Record<string, unknown>;
            return !v[userId];
          }).length;
        setBadges({
          decisions: needsVote,
          chat:      chatRes.count ?? 0,
          itinerary: itinRes.count ?? 0,
          expenses:  splitsRes.data?.length ?? 0,
        });
      } catch (e) {
        console.log("[TripShell] badge refresh failed", e);
      }
    }
    refresh();
    const t = setInterval(refresh, 15_000); // re-poll every 15s
    return () => { cancelled = true; clearInterval(t); };
  }, [trip.id, pathname, chatOpen, supabase]);

  // When the user opens chat, mark all messages as read locally
  useEffect(() => {
    if (!chatOpen) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const key = `chat-last-read:${user.id}:${trip.id}`;
      localStorage.setItem(key, String(Date.now()));
      setBadges((b) => ({ ...b, chat: 0 }));
    })();
  }, [chatOpen, trip.id, supabase]);

  // On mobile, the chat is a fullscreen overlay (`fixed inset-0 z-40`). When
  // the user taps a different bottom-nav tab the URL changes but `chatOpen`
  // state persists, leaving the chat stuck on top of the new page. Close it
  // automatically whenever the route changes. Same for the crew sheet.
  useEffect(() => {
    setChatOpen(false);
    setCrewOpen(false);
  }, [pathname]);

  function handleShareCopy() {
    if (!trip.shareToken) return;
    const appUrl = window.location.origin;
    const url = `${appUrl}/share/${trip.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden lg:ps-64">
      {/* B27: persistent desktop sidebar. Replaces the mobile-pattern
          top bar + sub-nav tabs + bottom-nav stack on lg+. Renders
          nothing under lg so mobile is untouched. */}
      <DesktopTripSidebar
        trip={trip}
        badges={badges}
        onChatOpen={() => setChatOpen(true)}
      />

      {/* Top bar — mobile only on lg+. Desktop nav lives in the sidebar. */}
      <header className="border-b border-border/50 bg-background shrink-0 z-40 lg:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="shrink-0 -ms-2 hover:bg-primary/8 hover:text-primary">
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link
              href="/dashboard"
              className="shrink-0 text-foreground hover:opacity-80 transition-opacity"
              aria-label="Paxawa home"
            >
              <Logo variant="mark" size="sm" />
            </Link>
            <div className="min-w-0">
              <p className="font-semibold truncate leading-tight">{trip.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {trip.destination} · {format(parseDateOnly(trip.startDate), "d MMM")} –{" "}
                {format(parseDateOnly(trip.endDate), "d MMM yyyy")}
              </p>
            </div>
          </div>

          {/* ── Right toolbar ────────────────────────────────────────
              Slimmed to three buttons: Crew · Chat · Avatar menu.
              Everything else (theme, share, calendar, shortcuts, trip
              settings, sign out) lives inside the avatar dropdown so
              the header isn't a wall of icons. */}
          <div className="flex items-center gap-1.5">
            {/* B13b: bell with unread badge + dropdown. Sits before
                Crew so notifications get prime real-estate in the
                header. */}
            <NotificationBell />

            {/* The Tools overflow now lives in the bottom nav (the 5th
                slot opens the same Tools sheet), so the header no longer
                carries a redundant ··· button — one overflow concept. */}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className="rounded-full shrink-0"
                    title={myProfile.displayName || "Profile"}
                  >
                    <UserAvatar
                      name={myProfile.displayName || "Me"}
                      avatarUrl={myProfile.avatarUrl}
                      size="md"
                    />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                {/* Primary nav */}
                <DropdownMenuItem
                  render={<Link href="/dashboard" />}
                  className="gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" /> All trips
                </DropdownMenuItem>
                {/* B19: profile (name + avatar + bio). */}
                <DropdownMenuItem
                  render={<Link href="/account/profile" />}
                  className="gap-2"
                >
                  <UserCircle className="w-4 h-4" /> {t("profile.menuLink")}
                </DropdownMenuItem>
                {/* B13c: account-level notification preferences. */}
                <DropdownMenuItem
                  render={<Link href="/account/notifications" />}
                  className="gap-2"
                >
                  <Bell className="w-4 h-4" /> {t("nav.notificationSettings")}
                </DropdownMenuItem>
                {/* B15: language switcher — sits next to the
                    settings link so the most personal toggles are
                    grouped at the top of the dropdown. */}
                <div className="px-1.5 py-0.5">
                  <LanguageSwitcher />
                </div>
                {/* Trip Settings lives in the header now (B3-a) — kept here as
                    a redundant entry only when the viewer is a non-owner so the
                    dropdown still shows a hint of what exists, but disabled. */}
                {!isOwner && (
                  <DropdownMenuItem
                    disabled
                    className="gap-2 text-muted-foreground/60"
                  >
                    <Settings className="w-4 h-4" /> Trip settings · owner only
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Trip actions */}
                {trip.shareToken && (
                  <DropdownMenuItem
                    onClick={handleShareCopy}
                    className="gap-2"
                  >
                    {shareCopied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {shareCopied ? "Link copied!" : "Copy share link"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  render={
                    <a href={`/api/trips/${trip.id}/calendar.ics`} download />
                  }
                  className="gap-2"
                >
                  <CalendarPlus className="w-4 h-4" /> Add to calendar
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* App preferences */}
                <DropdownMenuItem
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                  className="gap-2"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="gap-2"
                  disabled={theme === "system"}
                >
                  <Monitor className="w-4 h-4" /> Match system
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    document.dispatchEvent(
                      new CustomEvent("paxawa:shortcuts:show"),
                    )
                  }
                  className="gap-2 hidden sm:flex"
                >
                  <Keyboard className="w-4 h-4" /> Keyboard shortcuts
                </DropdownMenuItem>

                {/* Web push enrollment — renders nothing if VAPID isn't
                    configured server-side (NEXT_PUBLIC_VAPID_PUBLIC_KEY). */}
                <DropdownMenuItem
                  render={<EnablePushButton className="w-full inline-flex items-center gap-2 px-2 py-1.5 text-sm" />}
                  className="gap-2 p-0"
                />

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* P0-2: the top horizontal sub-nav tab strip is removed. It was a
            second parallel nav system on the sm–lg band (alongside the
            bottom MobileNav), the classic "mobile pattern stretched to a
            bigger screen" tell. One primary nav per breakpoint now:
            phone + tablet use the bottom nav; lg+ uses the left sidebar. */}
      </header>

      {/* Body row — content + chat side by side */}
      <div className="flex flex-1 overflow-hidden w-full max-w-full">
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          {/* B27-r2: cap was max-w-5xl (1024px). On wide desktops with the
              new 256px sidebar that left ~768px for content — too narrow
              for proper 2-col grids on Expenses / Bookings / Settings.
              Bumped to 7xl (1280px) so the multi-column layouts have
              real room to breathe. */}
          <div className="max-w-5xl lg:max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* B4: right-edge chat handle. On lg+ the sidebar already has a
            Chat entry so this floating handle would be a redundant
            third entry point — kept for sm+ where the sidebar is hidden
            but the bottom nav doesn't render either. */}
        {!chatOpen && (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="hidden sm:flex lg:hidden fixed right-0 top-1/3 z-30 items-center gap-1.5 rounded-l-full bg-primary text-primary-foreground ps-3 pe-2 py-2 shadow-lg shadow-primary/30 hover:pe-3 hover:translate-x-0 transition-all"
            title="Open chat"
            aria-label="Open chat"
          >
            <MessageSquare className="w-4 h-4" />
            {/* Decisions folded into Chat: the needs-your-vote count rides
                on the Chat handle alongside chat-unread. */}
            {badges.chat + badges.decisions > 0 && (
              <span className="min-w-[18px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center leading-none">
                {badges.chat + badges.decisions > 99 ? "99+" : badges.chat + badges.decisions}
              </span>
            )}
          </button>
        )}

        {/* Chat panel — pushes content on desktop, overlay on mobile.
            Lazy-rendered: we don't mount ChatSidebar (and pay its JS
            parse cost) until the user opens chat for the first time.
            The collapse animation still works because the wrapping div
            keeps the width transition; ChatSidebar slides in once
            mounted. */}
        <div
          className={`shrink-0 border-l bg-background overflow-hidden transition-[width] duration-300 ease-out hidden sm:block ${
            chatOpen ? "w-[360px]" : "w-0"
          }`}
        >
          <div className="w-[360px] h-full">
            {chatOpen && (
              <ChatSidebar
                tripId={trip.id}
                tripName={trip.name}
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Mobile chat — full screen overlay.
            Uses h-[100dvh] (dynamic viewport height) so the layout shrinks
            when the soft keyboard opens, keeping the message input visible
            above it. With plain `inset-0` the overlay would extend behind
            the keyboard and the input would be hidden. */}
        {chatOpen && (
          <div className="sm:hidden fixed inset-x-0 top-0 z-40 bg-background flex flex-col h-[100dvh]">
            <ChatSidebar
              tripId={trip.id}
              tripName={trip.name}
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom nav — hidden on desktop, also hidden when the chat
          fullscreen overlay is open (otherwise the input bar gets covered
          by the nav and the user can't see what they're typing). */}
      {!chatOpen && (
        <MobileNav
          tripId={trip.id}
          onChatToggle={() => setChatOpen((o) => !o)}
          chatOpen={chatOpen}
          onToolsOpen={() => setMoreOpen(true)}
          toolsOpen={moreOpen}
          // Tools-resident signal only: the Decisions tile lives in the Tools
          // sheet, so an open vote needing this user is a real "something in
          // Tools needs you." (badges.itinerary belongs to the Plan tab — it
          // already renders its own count there — so it must not drive this dot.)
          toolsDot={badges.decisions > 0}
          badges={badges}
        />
      )}

      {/* Crew side panel — opened from the Users icon in the toolbar.
          Lazy-mounted: same trick as ChatSidebar — don't load the panel
          JS or run the members-fetch effect until the user opens it. */}
      {crewOpen && (
        <SidePanel
          open={crewOpen}
          onClose={() => setCrewOpen(false)}
          title="Trip crew"
          subtitle={`${trip.name}`}
          icon={<Users className="w-4 h-4 text-white" />}
          accentGradient="from-primary to-violet-600"
          width="md"
        >
          <CrewSheetContent tripId={trip.id} shareToken={trip.shareToken ?? null} />
        </SidePanel>
      )}

      {/* B20: trip More sheet — secondary trip surfaces consolidated
          under one ⋯ icon to keep the topbar clean. Chat opens via the
          existing chatOpen state; Crew via crewOpen. */}
      <TripMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        tripId={trip.id}
        isOwner={isOwner}
        shareToken={trip.shareToken ?? null}
        onCrewOpen={() => setCrewOpen(true)}
        onChatOpen={() => setChatOpen(true)}
        badges={{ chat: badges.chat, decisions: badges.decisions }}
      />

      {/* PWA install prompt */}
      <InstallPrompt />

      {/* B25-r3: pre-launch feedback widget dropped from trip pages.
          The floating bottom-right button competed with the Plan FAB +
          the Bookings forward-email hint + the Pack add button. Feedback
          still lives on the dashboard, which is the entry point for
          every session — that's the right place for app-wide feedback. */}

      {/* Trip-scoped keyboard shortcuts (?, c, /, g+i/v/e/d/s/h) */}
      <KeyboardShortcuts
        tripId={trip.id}
        onToggleChat={() => setChatOpen((o) => !o)}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * CrewSheetContent — content of the top-right Users-icon side panel.
 * Telegram-style: invite link at top, members list below with role badges.
 * Self-fetches members so the panel opens fast without prop-drilling.
 * ──────────────────────────────────────────────────────────────────────── */
function CrewSheetContent({ tripId, shareToken }: { tripId: string; shareToken: string | null }) {
  const supabase = createClient();
  const [members, setMembers] = useState<Array<{
    userId: string; displayName: string; role: string; avatarUrl: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // B19: include the joined profile so each crew row shows the
      // member's uploaded avatar (when they have one).
      const { data } = await supabase
        .from("trip_members")
        .select("user_id, display_name, role, profiles:user_id (avatar_url)")
        .eq("trip_id", tripId);
      if (cancelled) return;
      setMembers(
        (data ?? []).map((m: any) => ({
          userId: m.user_id,
          displayName: m.display_name,
          role: m.role,
          avatarUrl: m.profiles?.avatar_url ?? null,
        })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tripId, supabase]);

  const inviteUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/invite/${shareToken}`
      : null;

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (!inviteUrl) return;
    if (navigator.share) {
      navigator.share({ url: inviteUrl, title: "Join my trip" }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Invite link card */}
      {inviteUrl && (
        <div className="rounded-xl bg-gradient-to-br from-primary to-violet-600 p-4 text-white">
          <p className="text-sm font-bold mb-1">Invite your crew</p>
          <p className="text-xs text-white/80 mb-3">Anyone with this link can join — no account needed.</p>
          <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 mb-3">
            <p className="text-xs font-mono truncate flex-1">{inviteUrl}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors py-2 text-sm font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white text-primary hover:bg-white/90 transition-colors py-2 text-sm font-bold"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div>
        <p className="text-[11px] font-extrabold tracking-wider text-muted-foreground mb-2">
          {loading ? "LOADING…" : `${members.length} TRAVELER${members.length !== 1 ? "S" : ""}`}
        </p>
        <div className="flex flex-col gap-1.5">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <UserAvatar
                name={m.displayName}
                avatarUrl={m.avatarUrl}
                seed={m.userId}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{m.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {m.role === "owner" ? "Trip owner" : "Member"}
                </p>
              </div>
              {m.role === "owner" && (
                <span className="text-[10px] font-extrabold tracking-wide text-primary bg-primary/10 px-2 py-1 rounded-full">
                  OWNER
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
