"use client";

/**
 * Paxawa v2 — dwell capture (build-spec §A2).
 *
 * Measures how long each card stays ≥60% on screen — the honest "stopped to
 * look" signal. Idle-guarded: timers freeze when the tab is hidden so we never
 * credit a card because the phone was left face-up. Cap at 15s.
 *
 * Usage: attach the returned `containerRef` to the scroll container; give each
 * card a `data-place-id`. onDwell(placeId, dwellMs) fires on exit, skipping the
 * dead zone between a fast scroll-past (<1s) and the 2s interest threshold.
 */

import { useEffect, useRef } from "react";

export interface DwellOptions {
  threshold?: number; // min visible ratio to count (default 0.6)
  maxMs?: number; // cap a single dwell (default 15000)
}

export function useDwellTracker(
  onDwell: (placeId: string, dwellMs: number) => void,
  options: DwellOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDwellRef = useRef(onDwell);
  onDwellRef.current = onDwell;
  const threshold = options.threshold ?? 0.6;
  const maxMs = options.maxMs ?? 15000;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const timing = new Map<string, number>(); // placeId → start (perf.now)
    const intersecting = new Set<string>(); // currently ≥ threshold
    const elById = new Map<string, Element>();
    const now = () => performance.now();

    function emit(id: string) {
      const start = timing.get(id);
      timing.delete(id);
      if (start == null) return;
      if (document.visibilityState !== "visible") return;
      const dwell = Math.min(now() - start, maxMs);
      // skip the dead zone (1s–2s) where eventToSignal yields nothing.
      if (dwell < 1000 || dwell >= 2000) onDwellRef.current(id, dwell);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.placeId;
          if (!id) continue;
          if (e.isIntersecting && e.intersectionRatio >= threshold) {
            intersecting.add(id);
            if (document.visibilityState === "visible" && !timing.has(id)) {
              timing.set(id, now());
            }
          } else {
            intersecting.delete(id);
            emit(id);
          }
        }
      },
      { threshold: [0, threshold, 1] },
    );

    function scan() {
      const present = new Set<string>();
      container!.querySelectorAll<HTMLElement>("[data-place-id]").forEach((el) => {
        const id = el.dataset.placeId!;
        present.add(id);
        if (!elById.has(id)) {
          elById.set(id, el);
          io.observe(el);
        }
      });
      for (const [id, el] of [...elById]) {
        if (!present.has(id)) {
          io.unobserve(el);
          elById.delete(id);
          intersecting.delete(id);
          emit(id);
        }
      }
    }
    scan();

    const mo = new MutationObserver(scan);
    mo.observe(container, { childList: true, subtree: true });

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        timing.clear(); // freeze: discard in-progress, don't credit
      } else {
        const t = now();
        for (const id of intersecting) timing.set(id, t); // restart visible cards
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      timing.clear(); // discard on unmount, no spurious final dwell
    };
  }, [threshold, maxMs]);

  return { containerRef };
}
