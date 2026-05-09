"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Calendar, Wallet, MessageSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tripId: string;
  onChatToggle: () => void;
  chatOpen: boolean;
  /** Live counts shown as red badges on tab icons. Pass 0 to hide. */
  badges?: {
    home?: number;
    itinerary?: number;
    expenses?: number;
    chat?: number;
    documents?: number;
  };
}

/**
 * Floating pill bottom nav (Telegram-style). 4 tabs only — Crew lives as a
 * top-right sheet in the header now. Each tab can show a red badge with
 * a pending-action count. Active tab has a tinted indicator pill behind it.
 *
 * Hidden on screens >= sm (desktop has the persistent header tabs / chat
 * sidebar layout).
 */
export function MobileNav({ tripId, onChatToggle, chatOpen, badges = {} }: Props) {
  const pathname = usePathname();

  const tabs = [
    { id: "home" as const,      label: "Home",  href: `/trips/${tripId}`,           icon: Sparkles, exact: true },
    { id: "itinerary" as const, label: "Plan",  href: `/trips/${tripId}/itinerary`, icon: Calendar, exact: false },
    { id: "expenses" as const,  label: "Money", href: `/trips/${tripId}/expenses`,  icon: Wallet,   exact: false },
    { id: "documents" as const, label: "Docs",  href: `/trips/${tripId}/documents`, icon: FileText, exact: false },
  ];

  return (
    <div className="sm:hidden fixed left-0 right-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 pointer-events-none">
      <nav className="pointer-events-auto mx-auto max-w-[460px] h-16 flex items-stretch px-1 rounded-full bg-card border border-border shadow-2xl shadow-black/40 backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const badge = badges[tab.id] ?? 0;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full m-1 transition-all relative",
                isActive
                  ? "bg-primary/15 text-primary font-extrabold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <tab.icon
                  className={cn(
                    "transition-transform",
                    isActive ? "w-[22px] h-[22px]" : "w-5 h-5"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive border-[1.5px] border-card flex items-center justify-center text-[9px] font-black text-white leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-wider">{tab.label}</span>
            </Link>
          );
        })}

        {/* Chat toggle — same visual as the other tabs but driven by chatOpen prop */}
        <button
          type="button"
          onClick={onChatToggle}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-full m-1 transition-all relative",
            chatOpen
              ? "bg-primary/15 text-primary font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <MessageSquare
              className={cn(
                "transition-transform",
                chatOpen ? "w-[22px] h-[22px]" : "w-5 h-5"
              )}
              strokeWidth={chatOpen ? 2.5 : 2}
            />
            {(badges.chat ?? 0) > 0 && !chatOpen && (
              <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-destructive border-[1.5px] border-card flex items-center justify-center text-[9px] font-black text-white leading-none">
                {(badges.chat ?? 0) > 99 ? "99+" : badges.chat}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wider">Chat</span>
        </button>
      </nav>
    </div>
  );
}
