"use client";

/**
 * Paxawa v2 — dwell capture (build-spec §A2), honest edition.
 *
 * "Stopped on a card 2–5s" has to be measured truthfully, so:
 *  - **In view** = IntersectionObserver, card ≥60% visible.
 *  - **Dominant card** = of the in-view cards, the one whose center is closest
 *    to the viewport center — the one they're actually looking at. Only the
 *    dominant card accrues dwell, so a desktop grid with three 60%-visible cards
 *    doesn't credit all three.
 *  - **Scroll-paused gate** = the dwell timer only starts after scrolling has
 *    been still for ≥250ms, so cards you blow past don't get credited.
 *  - **Idle guard** = tab hidden, window blur, or no interaction for 20s freezes
 *    the timer. Never credit a card because the phone was left face-up.
 *  - Credit capped at 15s; one dwell per view (re-entering a card = a new view).
 *
 * Attach `containerRef` to the scroll container; give each card a `data-place-id`.
 * onDwell(placeId, dwellMs) fires when the card stops being dominant, skipping
 * the 1s–2s dead zone (where eventToSignal yields nothing).
 */

import { useEffect, useRef } from "react";

export interface DwellOptions {
  threshold?: number; // min visible ratio to count (default 0.6)
  maxMs?: number; // cap a single dwell (default 15000)
  scrollPauseMs?: number; // stillness before a dwell starts (default 250)
  idleMs?: number; // no-interaction freeze (default 20000)
}

export function useDwellTracker(
  onDwell: (placeId: string, dwellMs: number) => void,
  options: DwellOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onDwellRef = useRef(onDwell);
  useEffect(() => {
    onDwellRef.current = onDwell; // keep latest callback without re-running the observer effect
  });
  const threshold = options.threshold ?? 0.6;
  const maxMs = options.maxMs ?? 15000;
  const scrollPauseMs = options.scrollPauseMs ?? 250;
  const idleMs = options.idleMs ?? 20000;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === "undefined") return;

    const visible = new Set<string>(); // ids currently ≥ threshold
    const elById = new Map<string, Element>();
    const now = () => performance.now();

    let active: { id: string; start: number } | null = null;
    let scrollPaused = true; // start settled
    let pauseTimer: number | null = null;
    let idleTimer: number | null = null;

    function emitActive() {
      if (!active) return;
      const { id, start } = active;
      active = null;
      if (document.visibilityState !== "visible") return;
      const dwell = Math.min(now() - start, maxMs);
      if (dwell < 1000 || dwell >= 2000) onDwellRef.current(id, dwell);
    }

    /** The in-view card whose center is nearest the viewport vertical center. */
    function dominant(): string | null {
      const mid = window.innerHeight / 2;
      let best: string | null = null;
      let bestDist = Infinity;
      for (const id of visible) {
        const el = elById.get(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dist = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = id;
        }
      }
      return best;
    }

    /** Reconcile the active dwell with the current dominant card. */
    function evaluate() {
      const dom = dominant();
      // Dominant changed (or gone) → close out the old dwell.
      if (active && active.id !== dom) emitActive();
      // Start a dwell only when settled, visible, and the tab is focused.
      if (
        dom &&
        !active &&
        scrollPaused &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        active = { id: dom, start: now() };
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.placeId;
          if (!id) continue;
          if (e.isIntersecting && e.intersectionRatio >= threshold) visible.add(id);
          else visible.delete(id);
        }
        evaluate();
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
          visible.delete(id);
          if (active?.id === id) emitActive();
        }
      }
    }
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(container, { childList: true, subtree: true });

    function markInteraction() {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        // No interaction for idleMs → they walked away. Discard, don't credit.
        active = null;
      }, idleMs);
    }

    function onScroll() {
      scrollPaused = false;
      markInteraction();
      // Scrolling onto a different card closes the prior dwell immediately.
      if (active && active.id !== dominant()) emitActive();
      if (pauseTimer) window.clearTimeout(pauseTimer);
      pauseTimer = window.setTimeout(() => {
        scrollPaused = true;
        evaluate();
      }, scrollPauseMs);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") emitActive();
      else evaluate();
    }
    function onBlur() {
      emitActive();
    }

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("pointermove", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    markInteraction();

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("pointermove", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      if (pauseTimer) window.clearTimeout(pauseTimer);
      if (idleTimer) window.clearTimeout(idleTimer);
      active = null; // discard on unmount, no spurious final dwell
    };
  }, [threshold, maxMs, scrollPauseMs, idleMs]);

  return { containerRef };
}
