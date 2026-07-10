"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { tripPhase } from "@/lib/trip-phase";
import { flushQueue } from "@/lib/offline-queue";
import { setStopCompleted } from "@/lib/actions/itinerary";
import { createCameraExpense } from "@/lib/actions/expenses";

export interface PocketDayStatus {
  date: string; // day cached (ISO)
  stops: number;
  updatedAt: string;
}

const STATUS_KEY = "paxawa-pocket-day";
const TOGGLE_KEY = "paxawa-pocket-day-enabled";

export function getPocketDayStatus(): PocketDayStatus | null {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as PocketDayStatus) : null;
  } catch {
    return null;
  }
}

export function pocketDayEnabled(): boolean {
  try {
    return localStorage.getItem(TOGGLE_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * Phase 6 §10 — Pocket Day. Runs only in DEPARTURE (day 0/1) or LIVE.
 * On app open in the evening (≥21:00, the periodicsync fallback) — or when
 * nothing is cached for tomorrow yet — it warms the SW caches with
 * tomorrow's pages + stop photos and stamps the status for the Account
 * sheet row. Also owns the reconnect flush of the offline outbox.
 */
export function PocketDay({
  tripId, startDate, endDate, days, stops,
}: {
  tripId: string;
  startDate: string;
  endDate: string;
  days: string[];
  stops: { dayDate: string; photoUrl: string | null }[];
}) {
  // Reconnect → flush the outbox (§10-B).
  useEffect(() => {
    const flush = async () => {
      try {
        const synced = await flushQueue({
          checkoff: async (p) => {
            const { itemId, tripId: t, done } = p as { itemId: string; tripId: string; done: boolean };
            await setStopCompleted(itemId, t, done);
          },
          expense: async (p) => {
            await createCameraExpense(p as Parameters<typeof createCameraExpense>[0]);
          },
        });
        if (synced > 0) toast.success(`${synced} ${synced === 1 ? "change" : "changes"} synced ✓`);
      } catch {
        /* retry next reconnect */
      }
    };
    window.addEventListener("online", flush);
    if (navigator.onLine) void flush();
    return () => window.removeEventListener("online", flush);
  }, []);

  // Dev-audit A3: manual [Refresh now] from the Account sheet re-runs the
  // warmer immediately (only meaningful while a trip cockpit is mounted).
  useEffect(() => {
    const refresh = () => {
      try {
        localStorage.removeItem("paxawa-pocket-day");
      } catch {}
      window.dispatchEvent(new CustomEvent("paxawa:pocketRefreshTick"));
    };
    window.addEventListener("paxawa:pocketRefresh", refresh);
    return () => window.removeEventListener("paxawa:pocketRefresh", refresh);
  }, []);

  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const bump = () => setRefreshTick((n) => n + 1);
    window.addEventListener("paxawa:pocketRefreshTick", bump);
    return () => window.removeEventListener("paxawa:pocketRefreshTick", bump);
  }, []);

  // Nightly pre-cache (§10-A fallback path).
  useEffect(() => {
    if (!navigator.onLine || !pocketDayEnabled()) return;
    const phase = tripPhase({ startDate, endDate });
    if (phase !== "LIVE" && phase !== "DEPARTURE") return;

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    // Target: tomorrow during LIVE (or T-1 evening); day 1 during DEPARTURE.
    const idx = days.indexOf(todayIso);
    const target = phase === "LIVE" && idx >= 0 && idx < days.length - 1 ? days[idx + 1] : days[0];
    if (!target) return;

    const status = getPocketDayStatus();
    const evening = now.getHours() >= 21;
    const stale = !status || status.date !== target;
    if (!stale && !evening) return;
    if (status?.date === target && status.updatedAt.slice(0, 10) === todayIso) return;

    const targetStops = stops.filter((s) => s.dayDate === target);
    const warm = async () => {
      try {
        // Pages — the SW's network-first page cache keeps these for offline.
        await Promise.allSettled([
          fetch(`/trips/${tripId}`),
          fetch(`/trips/${tripId}/itinerary?day=${target}`),
        ]);
        // Stop photos — cache-first in the SW.
        await Promise.allSettled(
          targetStops.filter((s) => s.photoUrl).slice(0, 30).map((s) => fetch(s.photoUrl as string)),
        );
        localStorage.setItem(
          STATUS_KEY,
          JSON.stringify({ date: target, stops: targetStops.length, updatedAt: new Date().toISOString() } satisfies PocketDayStatus),
        );
      } catch {
        /* partial cache is fine — never surface an error for a warmer */
      }
    };
    const id = window.setTimeout(warm, 4000); // after first paint settles
    return () => window.clearTimeout(id);
  }, [tripId, startDate, endDate, days, stops, refreshTick]);

  return null;
}
