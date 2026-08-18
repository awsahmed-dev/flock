"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from "react";

/**
 * One drag mechanism for every bottom sheet.
 *
 * Why this exists: the Now sheet's only grab surface was a 20px pill, and on
 * Android a touch that landed on the ticket (a link) opened the long-press
 * context menu instead of dragging — the "I have to hold for a second"
 * complaint. The itinerary sheet used motion's dragControls, which did not
 * follow a real touch at all in emulation and rubber-banded on the phone.
 *
 * The rules that make touch dragging reliable:
 *   • the drag ZONE gets `touch-action: none` — the browser never claims the
 *     gesture for scrolling, so pointermove keeps firing;
 *   • pointer capture on the zone element itself (not e.target), so the
 *     gesture survives the finger leaving the element;
 *   • a 6px slop before it counts as a move, so taps stay taps;
 *   • after a real drag the following click is swallowed at capture phase,
 *     so a link under the finger does not navigate;
 *   • long-press callout/selection are suppressed inside the zone.
 *
 * Spread `zoneProps` on one or more elements — the state is shared, so a
 * handle row and a header block can both drag the same sheet.
 */
export function useSheetDrag(opts: {
  onStart?: () => void;
  /** dy > 0 = finger moved down. */
  onMove: (dy: number) => void;
  /** vy in px/s, positive = down. `tapTarget` is set only when it was a tap. */
  onEnd: (r: { dy: number; vy: number; moved: boolean; target: EventTarget | null }) => void;
}) {
  const st = useRef<{
    id: number;
    startY: number;
    lastY: number;
    lastT: number;
    vy: number;
    moved: boolean;
    el: HTMLElement;
  } | null>(null);
  const suppressUntil = useRef(0);
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  function finish(e: RPointerEvent, cancelled: boolean) {
    const d = st.current;
    if (!d || d.id !== e.pointerId) return;
    st.current = null;
    try { d.el.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (d.moved) suppressUntil.current = performance.now() + 400;
    optsRef.current.onEnd({
      dy: e.clientY - d.startY,
      vy: cancelled ? 0 : d.vy,
      moved: d.moved,
      target: d.moved ? null : e.target,
    });
  }

  const zoneProps = {
    onPointerDown(e: RPointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      st.current = { id: e.pointerId, startY: e.clientY, lastY: e.clientY, lastT: performance.now(), vy: 0, moved: false, el };
      optsRef.current.onStart?.();
    },
    onPointerMove(e: RPointerEvent) {
      const d = st.current;
      if (!d || d.id !== e.pointerId) return;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.abs(dy) < 6) return;
      d.moved = true;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      d.vy = 0.5 * d.vy + 0.5 * (((e.clientY - d.lastY) / dt) * 1000);
      d.lastY = e.clientY;
      d.lastT = now;
      optsRef.current.onMove(dy);
    },
    onPointerUp(e: RPointerEvent) { finish(e, false); },
    onPointerCancel(e: RPointerEvent) { finish(e, true); },
    onClickCapture(e: RMouseEvent) {
      if (performance.now() < suppressUntil.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    onContextMenu(e: RMouseEvent) { e.preventDefault(); },
    style: {
      touchAction: "none",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTouchCallout: "none",
    } as CSSProperties,
  };

  return { zoneProps, isDragging: () => st.current?.moved === true };
}
