"use client";

/**
 * Paxawa v2 — the client taste session.
 *
 * Holds the FAST session vector in React state. Seeds it from the member's
 * durable vector (so returning users feel personalized instantly), applies
 * every micro-interaction locally for instant re-rank, and queues the same
 * events to the server for durable learning. Build-spec §2.1 / §A5.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceFeatures } from "@/lib/places/types";
import { emptyVector, type TasteVector, applySessionSignal } from "../taste";
import { eventToSignal, type RawEvent } from "../ingest";
import { EventQueue } from "./event-queue";

export interface EmitOptions {
  placeId: string;
  features: PlaceFeatures;
  payload?: Record<string, unknown> | null;
}

export interface TasteSession {
  /** current fast session vector — feed ranks against this. */
  vector: TasteVector;
  /** true once the durable seed has loaded. */
  ready: boolean;
  /** record a micro-interaction: updates the session vector locally + queues it. */
  emit: (eventType: string, opts: EmitOptions) => void;
}

export function useTasteSession(tripId: string): TasteSession {
  const [vector, setVector] = useState<TasteVector>(emptyVector);
  const [ready, setReady] = useState(false);
  const queueRef = useRef<EventQueue | null>(null);

  // One queue per trip.
  if (!queueRef.current) {
    queueRef.current = new EventQueue(tripId);
  }

  // Seed the session vector from the durable vector on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/discover/profile?tripId=${tripId}`);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (!cancelled && data?.durable) setVector(data.durable as TasteVector);
        }
      } catch {
        // start from empty — cold-start seed feed still works.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // Flush remaining events on unmount.
  useEffect(() => {
    const q = queueRef.current;
    return () => q?.dispose();
  }, []);

  const emit = useCallback((eventType: string, opts: EmitOptions) => {
    const signal = eventToSignal({
      type: eventType,
      payload: opts.payload as RawEvent["payload"],
    });
    // Update the fast session vector locally for instant re-rank.
    if (signal) {
      setVector((v) => applySessionSignal(v, opts.features, signal));
    }
    // Queue for durable learning (server folds confirmed signals).
    queueRef.current?.push({
      type: eventType,
      placeId: opts.placeId,
      payload: opts.payload ?? null,
      features: opts.features,
    });
  }, []);

  return { vector, ready, emit };
}
