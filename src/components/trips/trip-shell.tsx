"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LogOut,
  LayoutDashboard,
  MapPin,
  Vote,
  Wallet,
  FileText,
  Backpack,
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { MobileNav } from "@/components/pwa/mobile-nav";
import { EnablePushButton } from "@/components/pwa/enable-push";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { SidePanel } from "@/components/ui/side-panel";
import { KeyboardShortcuts } from "@/components/trips/keyboard-shortcuts";

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
  children: React.ReactNode;
}

// Desktop top tabs — Members moved out (now a top-right "Users" icon
// that opens a side panel, mirroring WhatsApp's group-info pattern).
const NAV_TABS = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Itinerary", href: "/itinerary", icon: MapPin },
  { label: "Votes", href: "/votes", icon: Vote },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Packing", href: "/packing", icon: Backpack },
];

export function TripShell({ trip, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [chatOpen, setChatOpen] = useState(false);
  const [crewOpen, setCrewOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

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
    chat: number; itinerary: number; expenses: number;
  }>({ chat: 0, itinerary: 0, expenses: 0 });

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId || !trip.id) return;

        const lastReadKey = `chat-last-read:${userId}:${trip.id}`;
        const lastRead = parseInt(localStorage.getItem(lastReadKey) ?? "0", 10);

        const [chatRes, itinRes, splitsRes] = await Promise.all([
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
        ]);

        if (cancelled) return;
        setBadges({
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-background shrink-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2 hover:bg-primary/8 hover:text-primary">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">✈</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate leading-tight">{trip.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {trip.destination} · {format(parseISO(trip.startDate), "MMM d")} –{" "}
                {format(parseISO(trip.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* ── Right toolbar ────────────────────────────────────────
              Slimmed to three buttons: Crew · Chat · Avatar menu.
              Everything else (theme, share, calendar, shortcuts, trip
              settings, sign out) lives inside the avatar dropdown so
              the header isn't a wall of icons. */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCrewOpen(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Crew"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => setChatOpen((o) => !o)}
              className={cn(
                "p-2 rounded-lg transition-colors relative",
                chatOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
              title={chatOpen ? "Close chat" : "Open chat"}
            >
              <MessageSquare className="w-4 h-4" />
              {badges.chat > 0 && !chatOpen && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-black flex items-center justify-center leading-none border-[1.5px] border-background">
                  {badges.chat > 99 ? "99+" : badges.chat}
                </span>
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className="rounded-full shrink-0"
                    title="Settings & profile"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        Me
                      </AvatarFallback>
                    </Avatar>
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
                <DropdownMenuItem
                  render={<Link href={`/trips/${trip.id}/settings`} />}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" /> Trip settings
                </DropdownMenuItem>

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

        {/* Sub-nav tabs — hidden on mobile (the bottom MobileNav already
            covers navigation, so the duplicate top tabs are noise). */}
        <div className="hidden sm:flex max-w-6xl mx-auto px-4 sm:px-6 gap-1 overflow-x-auto pb-0 scrollbar-none">
          {NAV_TABS.map((tab) => {
            const href = `/trips/${trip.id}${tab.href}`;
            const isActive =
              tab.href === ""
                ? pathname === `/trips/${trip.id}`
                : pathname.startsWith(href);

            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Body row — content + chat side by side */}
      <div className="flex flex-1 overflow-hidden w-full max-w-full">
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 pb-24 sm:pb-6">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Chat panel — pushes content on desktop, overlay on mobile */}
        <div
          className={`shrink-0 border-l bg-background overflow-hidden transition-[width] duration-300 ease-out hidden sm:block ${
            chatOpen ? "w-[360px]" : "w-0"
          }`}
        >
          <div className="w-[360px] h-full">
            <ChatSidebar
              tripId={trip.id}
              tripName={trip.name}
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
            />
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
          badges={badges}
        />
      )}

      {/* Crew side panel — opened from the Users icon in the toolbar.
          Telegram/WhatsApp-style "group info" pattern: members, invite
          link, leave/remove controls. Replaces the old Members tab. */}
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

      {/* PWA install prompt */}
      <InstallPrompt />

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
    userId: string; displayName: string; role: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("trip_members")
        .select("user_id, display_name, role")
        .eq("trip_id", tripId);
      if (cancelled) return;
      setMembers(
        (data ?? []).map((m: any) => ({
          userId: m.user_id, displayName: m.display_name, role: m.role,
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
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                {m.displayName.charAt(0).toUpperCase()}
              </div>
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
