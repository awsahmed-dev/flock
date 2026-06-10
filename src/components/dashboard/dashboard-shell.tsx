"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface Props {
  children: React.ReactNode;
  /**
   * B24-followup: profile/account menu rendered in the top-right of the
   * global header. The placeholder "Me" avatar that lived here was a
   * leftover from the early scaffold — the dashboard page now passes a
   * real DashboardAccountMenu with the signed-in user's avatar +
   * Profile / Notifications / Theme / Sign-out. When this prop is
   * omitted (sub-pages that don't fetch user info) the slot is empty.
   */
  accountMenu?: React.ReactNode;
}

export function DashboardShell({ children, accountMenu }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center text-foreground shrink-0"
            aria-label="Paxawa dashboard"
          >
            <Logo variant="full" size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {accountMenu}
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 pb-16">
        {children}
      </main>

      <FeedbackWidget />
    </div>
  );
}
