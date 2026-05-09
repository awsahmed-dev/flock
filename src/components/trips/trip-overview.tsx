"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Users,
  Calendar,
  Wallet,
  ArrowRight,
  MapPin,
  Clock,
  Link2,
  Sparkles,
  Hotel,
  FileText,
  Vote,
} from "lucide-react";
import { format, parseISO, differenceInDays, isPast, isFuture, differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { AiPlannerPanel } from "./ai-planner-panel";
import { HotelSearchPanel } from "@/components/hotels/hotel-search-panel";
import { ActivityFeed } from "./activity-feed";

interface Member {
  id: string;
  displayName: string;
  role: "owner" | "member";
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetTotal: number | null;
  currency: string;
  members: Member[];
}

interface Props {
  trip: Trip;
  inviteUrl: string | null;
  userId: string;
}

const AVATAR_COLORS = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
];

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-500",
  "from-fuchsia-500 to-violet-600",
  "from-teal-500 to-emerald-600",
];

function getGradient(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

function getMemberColor(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getTripStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (now >= start && now <= end) return { label: "Ongoing now", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  if (isPast(end)) return { label: "Completed", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  const days = differenceInCalendarDays(start, now);
  return {
    label: days === 0 ? "Starts today!" : days === 1 ? "Starts tomorrow" : `In ${days} days`,
    color: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  };
}

export function TripOverview({ trip, inviteUrl }: Props) {
  const [copied, setCopied] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);

  const nights = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate));
  const gradient = getGradient(trip.id);
  const tripStatus = getTripStatus(trip.startDate, trip.endDate);

  async function copyInviteLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  // navLinks removed — the previous 4-tile grid duplicated the bottom-nav
  // tabs. High-frequency tabs live in the bottom nav; less-frequent views
  // (Crew / Docs / Map / Photos) are reachable via the pill row under
  // the hero card.

  return (
    <div className="space-y-6">
      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Decorative orbs */}
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-20 -bottom-8 w-32 h-32 rounded-full bg-white/8 pointer-events-none" />
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-black/8 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8">
          {/* Status badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tripStatus.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {tripStatus.label}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">
                {trip.destination}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                {trip.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(trip.startDate), "MMM d")} – {format(parseISO(trip.endDate), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {nights} night{nights !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                  <Users className="w-3.5 h-3.5" />
                  {trip.members.length} traveler{trip.members.length !== 1 ? "s" : ""}
                </span>
                {trip.budgetTotal && (
                  <span className="flex items-center gap-1.5 text-white/80 text-sm">
                    <Wallet className="w-3.5 h-3.5" />
                    {trip.currency} {trip.budgetTotal.toLocaleString()} budget
                  </span>
                )}
              </div>
            </div>

            {/* Member stack */}
            <div className="flex items-center -space-x-2 shrink-0">
              {trip.members.slice(0, 5).map((m) => {
                const c = getMemberColor(m.id);
                return (
                  <div
                    key={m.id}
                    title={m.displayName}
                    className={`w-8 h-8 rounded-full ${c.bg} ${c.text} border-2 border-white/30 flex items-center justify-center text-xs font-bold shrink-0`}
                  >
                    {m.displayName.slice(0, 2).toUpperCase()}
                  </div>
                );
              })}
              {trip.members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-black/25 text-white border-2 border-white/30 flex items-center justify-center text-xs font-bold shrink-0">
                  +{trip.members.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick-access pills under the hero — fast jumps to less-frequent
          views (Members / Documents / Map / Photos). The high-frequency
          tabs already live in the bottom nav; these pills cover everything
          else without spending screen space on a tile grid. */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
        <Link
          href={`/trips/${trip.id}/members`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-accent/50 px-3.5 py-1.5 text-xs font-semibold transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-cyan-500" />
          Crew
        </Link>
        <Link
          href={`/trips/${trip.id}/documents`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-accent/50 px-3.5 py-1.5 text-xs font-semibold transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-amber-500" />
          Docs
        </Link>
        <Link
          href={`/trips/${trip.id}/itinerary?view=map`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-accent/50 px-3.5 py-1.5 text-xs font-semibold transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          Map
        </Link>
        <Link
          href={`/trips/${trip.id}/documents?type=image`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-accent/50 px-3.5 py-1.5 text-xs font-semibold transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          Photos
        </Link>
      </div>

      {/* ── Activity Feed — capped at 5 most-recent events with summary
          chips on top. Total scale lives in the chips; the feed shows
          "what just happened" so the page stays scannable. */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold tracking-tight">Activity</h2>
        </div>
        <ActivityFeed tripId={trip.id} />
      </div>

      {/* ── Smart tools ────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="group text-left rounded-2xl border border-border/60 hover:border-primary/40 bg-gradient-to-br from-primary/5 via-violet-500/5 to-background hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-primary/30 group-hover:scale-110 transition-transform duration-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">AI Trip Planner</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
              Generate a smart itinerary for {trip.destination}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setHotelOpen(true)}
          className="group text-left rounded-2xl border border-border/60 hover:border-blue-400/40 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-background hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform duration-200">
            <Hotel className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Find a Stay</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
              Search hotels, hostels, apartments — filter by budget
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      </div>

      {/* ── Members + Invite ───────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Members */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Crew ({trip.members.length})</h3>
            <Link href={`/trips/${trip.id}/members`}>
              <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                Manage →
              </button>
            </Link>
          </div>
          <div className="space-y-3">
            {trip.members.map((member) => {
              const c = getMemberColor(member.id);
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${c.bg} ${c.text} flex items-center justify-center text-xs font-bold shrink-0`}>
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium flex-1 truncate">{member.displayName}</span>
                  {member.role === "owner" && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      Owner
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite */}
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Invite your crew</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Share this link to invite friends. They can join with just their name — no account needed.
          </p>
          {inviteUrl ? (
            <div className="space-y-2">
              <div className="text-xs bg-muted/60 rounded-lg px-3 py-2.5 truncate border border-border/50 font-mono text-muted-foreground">
                {inviteUrl}
              </div>
              <button
                onClick={copyInviteLink}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-gradient-to-r from-primary to-violet-600 text-white hover:opacity-90 shadow-md shadow-primary/20"
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy invite link"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No invite token set.</p>
          )}
        </div>
      </div>

      {/* Panels */}
      <AiPlannerPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        tripId={trip.id}
        destination={trip.destination}
      />
      <HotelSearchPanel
        open={hotelOpen}
        onClose={() => setHotelOpen(false)}
        tripId={trip.id}
        destination={trip.destination}
      />
    </div>
  );
}
