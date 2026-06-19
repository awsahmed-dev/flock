"use client";

/**
 * Paxawa v2 — client event batching queue.
 *
 * Collects discovery micro-interactions and flushes them to
 * /api/discover/events in batches (~every 2s or when the buffer fills), so we
 * persist durable learning without a network round-trip per dwell. Best-effort:
 * a failed flush silently drops that batch — learning is not worth blocking UX.
 */

import type { PlaceFeatures } from "@/lib/places/types";

export interface QueuedEvent {
  type: string;
  placeId?: string | null;
  payload?: Record<string, unknown> | null;
  features?: PlaceFeatures | null;
}

const FLUSH_MS = 2000;
const MAX_BUFFER = 25;

export class EventQueue {
  private buffer: QueuedEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onDurable?: (vector: unknown) => void;

  constructor(
    private tripId: string,
    opts: { onDurable?: (vector: unknown) => void } = {},
  ) {
    this.onDurable = opts.onDurable;
  }

  push(ev: QueuedEvent) {
    this.buffer.push(ev);
    if (this.buffer.length >= MAX_BUFFER) {
      void this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => void this.flush(), FLUSH_MS);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;
    const events = this.buffer;
    this.buffer = [];
    try {
      const res = await fetch("/api/discover/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: this.tripId, events }),
        keepalive: true, // survive a tab close mid-flush
      });
      if (res.ok && this.onDurable) {
        const data = await res.json().catch(() => null);
        if (data?.durable) this.onDurable(data.durable);
      }
    } catch {
      // best-effort: drop the batch, don't disrupt the user.
    }
  }

  /** Flush + stop the timer (call on unmount). */
  dispose() {
    void this.flush();
    if (this.timer) clearTimeout(this.timer);
  }
}
