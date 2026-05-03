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
  Settings,
  ChevronLeft,
  MessageSquare,
  Share2,
  Check,
  Copy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileNav } from "@/components/pwa/mobile-nav";
import { InstallPrompt } from "@/components/pwa/install-prompt";

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

const NAV_TABS = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Itinerary", href: "/itinerary", icon: MapPin },
  { label: "Votes", href: "/votes", icon: Vote },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Members", href: "/members", icon: Users },
];

export function TripShell({ trip, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // On mobile, the chat is a fullscreen overlay (`fixed inset-0 z-40`). When
  // the user taps a different bottom-nav tab the URL changes but `chatOpen`
  // state persists, leaving the chat stuck on top of the new page. Close it
  // automatically whenever the route changes.
  useEffect(() => {
    setChatOpen(false);
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

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {/* Share button — only shown when sharing is enabled */}
            {trip.shareToken && (
              <button
                onClick={handleShareCopy}
                className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                title="Copy share link"
              >
                {shareCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => setChatOpen((o) => !o)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                chatOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={chatOpen ? "Close chat" : "Open chat"}
            >
              <MessageSquare className="w-4 h-4" />
            </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-full shrink-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      Me
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
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

        {/* Sub-nav tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto pb-0 scrollbar-none">
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
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
          <div className="max-w-5xl mx-auto">
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

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileNav
        tripId={trip.id}
        onChatToggle={() => setChatOpen((o) => !o)}
        chatOpen={chatOpen}
      />

      {/* PWA install prompt */}
      <InstallPrompt />
    </div>
  );
}
