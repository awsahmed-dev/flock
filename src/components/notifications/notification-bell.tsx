"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Receipt, CheckSquareOffset as Vote, Gavel, Check, Users as UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { formatDistanceToNow } from "@/lib/i18n/date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

interface InboxRow {
  id: string;
  tripId: string;
  kind: string;
  title: string | null;
  body: string | null;
  payload: unknown;
  actorUserId: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Per-kind icon + click destination. Falls back to the trip overview
 * for any kind we haven't added a route for yet.
 */
function metaFor(kind: string, tripId: string) {
  switch (kind) {
    case "expense_logged":
      return { icon: Receipt, href: `/trips/${tripId}/expenses`, tint: "text-emerald-500" };
    case "split_settled":
      return { icon: Check, href: `/trips/${tripId}/expenses`, tint: "text-emerald-500" };
    case "vote_opened":
    case "vote_closed":
      return { icon: Vote, href: `/trips/${tripId}/decisions`, tint: "text-violet-500" };
    case "decision_opened":
      return { icon: Gavel, href: `/trips/${tripId}/decisions`, tint: "text-violet-500" };
    case "decision_resolved":
      return { icon: Gavel, href: `/trips/${tripId}/itinerary`, tint: "text-emerald-500" };
    case "member_joined":
      return { icon: UsersIcon, href: `/trips/${tripId}`, tint: "text-blue-500" };
    default:
      return { icon: Bell, href: `/trips/${tripId}`, tint: "text-muted-foreground" };
  }
}

/**
 * B13b: header bell + dropdown of recent notifications.
 *
 * Polls /api/notifications every 60s while open; the dropdown shows a
 * red dot when unread > 0. Opening the dropdown is what marks-all-read
 * — tap-anywhere to dismiss matches the chat-app convention.
 */
export function NotificationBell() {
  const t = useT();
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { rows: InboxRow[]; unread: number };
      setRows(data.rows);
      setUnread(data.unread);
    } catch {
      /* network blip — keep prior state */
    }
  }, []);

  // Initial load + 60s poll. Cheap because the rows table is tiny and
  // indexed on (user_id, read_at, created_at).
  useEffect(() => {
    fetchInbox();
    const t = setInterval(fetchInbox, 60_000);
    return () => clearInterval(t);
  }, [fetchInbox]);

  // Opening the dropdown marks everything seen so far as read. We do
  // this optimistically so the badge clears without waiting for the
  // POST round-trip.
  useEffect(() => {
    if (!open || unread === 0) return;
    setUnread(0);
    setRows((prev) =>
      prev.map((r) =>
        r.readAt ? r : { ...r, readAt: new Date().toISOString() },
      ),
    );
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, [open, unread]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={t("notifications.title")}
            aria-label={`${t("notifications.title")}${unread > 0 ? ` (${unread})` : ""}`}
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-4 text-center tabular-nums shadow ring-2 ring-background">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border/60 flex items-center justify-between">
          <p className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
            {t("notifications.title")}
          </p>
          {rows.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {t("notifications.last", { count: rows.length })}
            </p>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {t("common.youreAllCaughtUp")}
            </p>
          </div>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {rows.map((r) => {
              const m = metaFor(r.kind, r.tripId);
              const Icon = m.icon;
              return (
                <li key={r.id}>
                  <Link
                    href={m.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0",
                      !r.readAt && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0",
                        m.tint,
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {r.title ?? r.kind}
                      </p>
                      {r.body && (
                        <p className="text-[12px] text-muted-foreground truncate">
                          {r.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(new Date(r.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!r.readAt && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"
                        aria-label="Unread"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
