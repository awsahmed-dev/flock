"use client";

import Link from "next/link";
import { Sparkles, Users, Vote, Wallet, ArrowRight } from "lucide-react";

/**
 * First-run onboarding for the dashboard. Shown in place of the bare
 * "No trips yet" empty state. Three illustrated steps to set expectations
 * about what Flock does, then a single big CTA into trip creation.
 *
 * Why one screen instead of a multi-step tour: the only "step" that
 * actually does anything is the first trip creation. Everything else
 * (invite crew, AI plan, vote, expense) only becomes meaningful inside a
 * trip, so a multi-step modal would just be filler. Set the expectation,
 * get them through the first action.
 */

const STEPS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
}> = [
  {
    icon: Users,
    title: "Plan together, not in a chaotic group chat",
    desc: "Drop in your friends with one link. Everyone sees the same plan, votes on the same options, owes the same totals.",
    iconBg: "bg-blue-100 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Sparkles,
    title: "Let AI draft your itinerary",
    desc: "Tell us where and when. Get a day-by-day plan in seconds, then drag, edit, or vote on what stays.",
    iconBg: "bg-violet-100 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: Wallet,
    title: "Track who paid for what, in any currency",
    desc: "Log expenses as they happen — equal-split or custom. Balances stay live, settlements stay clean.",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
];

export function OnboardingCard() {
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-6 sm:p-10 overflow-hidden relative">
      {/* Decorative orbs */}
      <div
        aria-hidden
        className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none"
      />

      <div className="relative">
        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
              <Sparkles className="w-3 h-3" />
              Welcome to Flock
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              Group trips, without the group-chat chaos.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Plan, vote, and split expenses in one place — so your next trip
              actually happens.
            </p>
          </div>
        </div>

        {/* 3 steps */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                    STEP {i + 1}
                  </span>
                </div>
                <p className="text-sm font-bold leading-snug">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-opacity"
        >
          Plan your first trip
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p className="text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Vote className="w-3 h-3" /> Group voting
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Expense splitting
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI itinerary
          </span>
        </p>
      </div>
    </div>
  );
}
