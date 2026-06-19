/**
 * Paxawa v2 — durable taste persistence (server-only).
 *
 * The thin DB layer around the pure engine. The fast SESSION vector lives in
 * the browser (instant re-rank, no round-trip); what persists here is the slow
 * DURABLE vector + the raw event log. Build-spec §2.1.
 */

import "server-only";
import { db } from "@/lib/db";
import { placeEvents, tasteProfiles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { PlaceFeatures } from "@/lib/places/types";
import { emptyVector, type TasteVector, applyDurableSignal } from "./taste";
import { eventToSignal, type RawEvent } from "./ingest";

/** Load a member's durable vector for a trip. Empty when none yet. */
export async function loadDurableVector(
  tripId: string,
  userId: string,
): Promise<TasteVector> {
  const row = await db.query.tasteProfiles.findFirst({
    where: and(eq(tasteProfiles.tripId, tripId), eq(tasteProfiles.userId, userId)),
  });
  return (row?.vector as TasteVector | undefined) ?? emptyVector();
}

/** Upsert a member's durable vector. Select-then-write avoids the functional
 *  unique index's conflict-target complexity. */
export async function saveDurableVector(
  tripId: string,
  userId: string,
  vector: TasteVector,
): Promise<void> {
  const existing = await db.query.tasteProfiles.findFirst({
    where: and(eq(tasteProfiles.tripId, tripId), eq(tasteProfiles.userId, userId)),
    columns: { id: true },
  });
  if (existing) {
    await db
      .update(tasteProfiles)
      .set({ vector, updatedAt: new Date() })
      .where(eq(tasteProfiles.id, existing.id));
  } else {
    await db.insert(tasteProfiles).values({ tripId, userId, vector });
  }
}

export interface IncomingEvent {
  type: string;
  placeId?: string | null;
  payload?: Record<string, unknown> | null;
  features?: PlaceFeatures | null;
}

/**
 * Persist a batch of client events and fold the confirmed ones into the
 * member's durable vector. Returns the updated durable vector (the client can
 * merge it into its session vector to stay in sync). Cache-write style: a log
 * failure must never break the user's flow, but the vector update is the point,
 * so we let that surface.
 */
export async function recordEventsAndLearn(
  tripId: string,
  userId: string,
  events: IncomingEvent[],
): Promise<TasteVector> {
  // 1. Raw log (best-effort).
  if (events.length) {
    await db
      .insert(placeEvents)
      .values(
        events.map((e) => ({
          tripId,
          userId,
          placeId: e.placeId ?? null,
          type: e.type,
          payload: e.payload ?? null,
          features: e.features ?? null,
        })),
      )
      .catch(() => {});
  }

  // 2. Fold confirmed signals into the durable vector.
  let v = await loadDurableVector(tripId, userId);
  let changed = false;
  for (const e of events) {
    if (!e.features) continue;
    const sig = eventToSignal({ type: e.type, payload: e.payload as RawEvent["payload"] });
    if (!sig) continue;
    const next = applyDurableSignal(v, e.features, sig);
    if (next !== v) {
      v = next;
      changed = true;
    }
  }
  if (changed) await saveDurableVector(tripId, userId, v);
  return v;
}
