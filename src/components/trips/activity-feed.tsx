"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Plane, Utensils, MapPin, BarChart3, Bed, Calendar,
  DollarSign, MessageSquare, UserPlus, FileText, ChevronRight,
} from "lucide-react";
import { parseISO, isToday, isYesterday } from "date-fns";
import { format, formatDistanceToNow } from "@/lib/i18n/date-fns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type EventKind = "itinerary" | "expense" | "vote" | "member" | "message";

interface ActivityEvent {
  id: string;
  kind: EventKind;
  createdAt: string;
  title: string;
  subtitle?: string;
  authorName?: string;
  iconName: string;            // lucide icon name (we map at render)
  color: string;
  href?: string;
  amount?: string;
}

/**
 * Trip activity feed — recent events at a glance.
 *
 * Capped at the most recent 5 events so the home page stays scannable. A
 * summary header at top shows total counts per category (e.g. "16 plans ·
 * 5 expenses · 2 votes") — total scale lives there, the feed below shows
 * "what just happened." Each row deep-links to the relevant tab so the
 * user can drill in for the full list when they want it.
 */
const MAX_EVENTS = 5;

export function ActivityFeed({
  tripId,
  tripHref,
}: {
  tripId: string;
  /** Base href for "see all" links. Defaults to /trips/[id]. */
  tripHref?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [counts, setCounts] = useState<{ items: number; expenses: number; votes: number }>({
    items: 0, expenses: 0, votes: 0,
  });
  const [loading, setLoading] = useState(true);
  const baseHref = tripHref ?? `/trips/${tripId}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [itinRes, expRes, voteRes, memberRes, msgRes] = await Promise.all([
          supabase.from("itinerary_items").select("*").eq("trip_id", tripId),
          supabase.from("expenses").select(`*, payer:profiles!expenses_paid_by_profiles_id_fk(display_name), splits:expense_splits(id)`).eq("trip_id", tripId),
          supabase.from("votes").select(`*, creator:profiles!votes_created_by_profiles_id_fk(display_name), responses:vote_responses(id)`).eq("trip_id", tripId),
          supabase.from("trip_members").select(`*, profile:profiles!trip_members_user_id_profiles_id_fk(display_name)`).eq("trip_id", tripId),
          supabase
            .from("chat_messages")
            .select(`id, body, created_at, type, user_id, author:profiles!chat_messages_user_id_fkey(display_name)`)
            .eq("trip_id", tripId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        // Surface RLS / API errors instead of silently rendering empty.
        // Saved us once already — when RLS helpers had EXECUTE revoked,
        // every query came back with `permission denied` and the empty
        // state hid the real cause.
        for (const [name, res] of [
          ["itinerary_items", itinRes], ["expenses", expRes], ["votes", voteRes],
          ["trip_members", memberRes], ["chat_messages", msgRes],
        ] as const) {
          if ((res as any).error) {
            console.warn(`[ActivityFeed] ${name} query failed:`, (res as any).error);
          }
        }

        const list: ActivityEvent[] = [];

        const typeIconName: Record<string, string> = {
          activity: "Sparkles", accommodation: "Bed", transport: "Plane",
          meal: "Utensils", other: "MapPin",
        };
        const typeColor: Record<string, string> = {
          activity: "#a855f7", accommodation: "#3b82f6", transport: "#f97316",
          meal: "#22c55e", other: "#94a3b8",
        };

        // Itinerary items — use updated_at if present, else day_date
        for (const it of itinRes.data ?? []) {
          list.push({
            id: `it-${it.id}`,
            kind: "itinerary",
            createdAt: it.created_at ?? it.day_date,
            title: `New plan: ${it.title}`,
            subtitle: `${it.type === "accommodation" ? "Stay" : it.type[0].toUpperCase() + it.type.slice(1)} · ${format(parseISO(it.day_date), "EEE, MMM d")}`,
            iconName: typeIconName[it.type] ?? "Sparkles",
            color: typeColor[it.type] ?? "#a855f7",
            href: `/trips/${tripId}/itinerary`,
          });
        }

        // Expenses
        for (const e of expRes.data ?? []) {
          const payer = (e as any).payer?.display_name ?? "Someone";
          const splits = (e as any).splits ?? [];
          list.push({
            id: `ex-${e.id}`,
            kind: "expense",
            createdAt: e.created_at ?? e.expense_date,
            title: `${payer} paid for ${e.title}`,
            subtitle: `${e.category} · ${splits.length > 1 ? `split ${splits.length} ways` : "solo"}`,
            iconName: "DollarSign",
            color: "#22c55e",
            href: `/trips/${tripId}/expenses`,
            amount: `${e.currency} ${Number(e.amount).toLocaleString()}`,
          });
        }

        // Votes
        for (const v of voteRes.data ?? []) {
          const author = (v as any).creator?.display_name ?? "Someone";
          const responses = (v as any).responses ?? [];
          list.push({
            id: `vt-${v.id}`,
            kind: "vote",
            createdAt: v.created_at,
            title: v.status === "open" ? `${author} opened a vote` : "Vote closed",
            subtitle: `${v.question} · ${responses.length} voted`,
            iconName: "BarChart3",
            color: v.status === "open" ? "#a855f7" : "#22c55e",
            href: `/trips/${tripId}/votes`,
          });
        }

        // Members (skip the owner)
        for (const m of memberRes.data ?? []) {
          if (m.role === "owner") continue;
          const name = (m as any).profile?.display_name ?? "Someone";
          list.push({
            id: `mb-${m.id}`,
            kind: "member",
            createdAt: m.created_at ?? new Date().toISOString(),
            title: `${name} joined the trip`,
            iconName: "UserPlus",
            color: "#06b6d4",
          });
        }

        // Recent chat messages
        for (const msg of msgRes.data ?? []) {
          if (!msg.body) continue;
          const author = (msg as any).author?.display_name ?? "Someone";
          list.push({
            id: `msg-${msg.id}`,
            kind: "message",
            createdAt: msg.created_at,
            title: `${author}: ${(msg.body ?? "").slice(0, 80)}`,
            iconName: "MessageSquare",
            color: "#3b82f6",
          });
        }

        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        if (!cancelled) {
          setEvents(list.slice(0, MAX_EVENTS));
          setCounts({
            items:    (itinRes.data ?? []).length,
            expenses: (expRes.data ?? []).length,
            votes:    (voteRes.data ?? []).length,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error("[ActivityFeed] load failed:", err);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tripId, supabase]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Loading activity…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <div className="text-3xl mb-2">✨</div>
        <p className="font-bold mb-1">Nothing yet</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Add a plan, log an expense, or send a chat — anything you and your
          crew do shows up here so everyone sees what's going on.
        </p>
      </div>
    );
  }

  // Group by day
  const groups: { label: string; events: ActivityEvent[] }[] = [];
  let currentLabel = "";
  for (const ev of events) {
    let label: string;
    try {
      const d = parseISO(ev.createdAt);
      label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, MMMM d");
    } catch {
      label = "Recent";
    }
    if (label !== currentLabel) {
      groups.push({ label, events: [ev] });
      currentLabel = label;
    } else {
      groups[groups.length - 1].events.push(ev);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary chips — total scale at a glance, click → drill into the
          full list. The feed below is capped at MAX_EVENTS to stay scannable. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <SummaryChip
          icon={<Calendar className="w-3.5 h-3.5" />}
          count={counts.items}
          label={`plan${counts.items === 1 ? "" : "s"}`}
          href={`${baseHref}/itinerary`}
          color="primary"
        />
        <SummaryChip
          icon={<DollarSign className="w-3.5 h-3.5" />}
          count={counts.expenses}
          label={`expense${counts.expenses === 1 ? "" : "s"}`}
          href={`${baseHref}/expenses`}
          color="emerald"
        />
        <SummaryChip
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          count={counts.votes}
          label={`vote${counts.votes === 1 ? "" : "s"}`}
          href={`${baseHref}/votes`}
          color="violet"
        />
      </div>

      {groups.map((g) => (
        <div key={g.label}>
          <p className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase mb-2 px-1">
            {g.label}
          </p>
          <div className="flex flex-col gap-1.5">
            {g.events.map((event) => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact pill at the top of the feed: icon + count + label, linked to
 * the relevant tab. Replaces the "list everything" feed of yesterday.
 */
function SummaryChip({
  icon, count, label, href, color,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  href: string;
  color: "primary" | "emerald" | "violet";
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary hover:bg-primary/15",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/15",
  };
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
        colorMap[color],
      )}
    >
      {icon}
      <span className="text-sm font-bold tabular-nums">{count}</span>
      <span className="text-xs font-medium opacity-80">{label}</span>
    </Link>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const Wrapper: any = event.href ? Link : "div";
  const props = event.href ? { href: event.href } : {};
  const Icon = ICONS[event.iconName] ?? Sparkles;

  return (
    <Wrapper
      {...props}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all",
        event.href && "hover:bg-accent/50 cursor-pointer",
      )}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${event.color}22` }}
      >
        <Icon className="w-4 h-4" style={{ color: event.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {event.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{event.subtitle}</p>
          )}
          <p className="text-[10px] text-muted-foreground/70 font-semibold">
            {timeAgo(event.createdAt)}
          </p>
        </div>
      </div>
      {event.amount && (
        <p className="text-xs font-extrabold shrink-0" style={{ color: event.color }}>
          {event.amount}
        </p>
      )}
      {event.href && (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
      )}
    </Wrapper>
  );
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

// Lucide icon name → component lookup. We can't dynamically import.
const ICONS: Record<string, any> = {
  Sparkles,
  Plane,
  Utensils,
  MapPin,
  Bed,
  DollarSign,
  BarChart3,
  UserPlus,
  MessageSquare,
  FileText,
};
