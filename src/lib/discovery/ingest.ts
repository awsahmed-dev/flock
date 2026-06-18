/**
 * Paxawa v2 — event → signal ingestion (pure).
 *
 * Maps a raw place_events row (the client-emitted micro-interactions) to a
 * SignalType, then applies it to the session + durable vectors. Kept DB-free so
 * it's fully unit-testable; the thin persistence layer lives in ./ingest-db.ts.
 *
 * Event types come from build-spec §A1. The dwell thresholds (§A2) live here.
 */

import type { PlaceFeatures } from "@/lib/places/types";
import {
  type TasteVector,
  type SignalType,
  applySessionSignal,
  applyDurableSignal,
} from "./taste";

export const DWELL_2S_MS = 2000;
export const DWELL_5S_MS = 5000;
/** open → back faster than this reads as "looked, nope". */
export const QUICK_BACK_MS = 2000;
/** in-viewport shorter than this reads as a fast scroll-past. */
export const FAST_SCROLL_MS = 1000;

export interface RawEvent {
  /** matches place_events.type */
  type: string;
  payload?: {
    dwellMs?: number;
    vote?: "yes" | "no";
    [k: string]: unknown;
  } | null;
}

/**
 * Resolve a raw event to a signal. Returns null when the event carries no
 * learning signal (e.g. a 2.4s dwell that's below threshold, or a bare
 * impression). Dwell uses the higher threshold first.
 */
export function eventToSignal(ev: RawEvent): SignalType | null {
  const ms = ev.payload?.dwellMs ?? 0;
  switch (ev.type) {
    case "card_dwell":
    case "card_exit":
      if (ms >= DWELL_5S_MS) return "dwell_5s";
      if (ms >= DWELL_2S_MS) return "dwell_2s";
      if (ms > 0 && ms < FAST_SCROLL_MS) return "scroll_past";
      return null;
    case "card_open":
      return "card_open";
    case "detail_dwell":
      return ms < QUICK_BACK_MS ? "open_then_back" : "detail_dwell";
    case "place_save":
      return "place_save";
    case "place_add":
      return "place_add";
    case "place_suggest":
      return "place_suggest";
    case "place_remove":
      return "place_remove";
    case "decision_vote":
      return ev.payload?.vote === "no" ? "decision_vote_no" : "decision_vote_yes";
    case "expense_at_place":
      return "expense_at_place";
    default:
      return null;
  }
}

export interface VectorPair {
  session: TasteVector;
  durable: TasteVector;
}

/**
 * Apply one event to both vectors. Session updates on every signal; durable
 * only on confirmed ones (handled inside applyDurableSignal). Events with no
 * signal pass through unchanged.
 */
export function ingestEvent(
  vectors: VectorPair,
  features: PlaceFeatures,
  ev: RawEvent,
): VectorPair {
  const signal = eventToSignal(ev);
  if (!signal) return vectors;
  return {
    session: applySessionSignal(vectors.session, features, signal),
    durable: applyDurableSignal(vectors.durable, features, signal),
  };
}

/** Apply a batch of events in order (client batches them ~every 2s). */
export function ingestBatch(
  vectors: VectorPair,
  events: Array<{ features: PlaceFeatures; ev: RawEvent }>,
): VectorPair {
  return events.reduce((acc, { features, ev }) => ingestEvent(acc, features, ev), vectors);
}
