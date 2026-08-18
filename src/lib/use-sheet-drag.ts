"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent, type TouchEvent as RTouchEvent } from "react";

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

  // Shared gesture core — pointer events for mouse/pen, TOUCH events for
  // fingers. Round 6: on Aws's Android the Plan sheet never received
  // pointermove for a touch that started on the pill/title (the tap fired
  // instead → the sheet "jumped"); touchmove is delivered unconditionally
  // once touch-action is none, so fingers drive the sheet through touch
  // events and pointer events ignore touch entirely.
  const TOUCH_ID = -999;
  function begin(id: number, y: number, el: HTMLElement) {
    st.current = { id, startY: y, lastY: y, lastT: performance.now(), vy: 0, moved: false, el };
    optsRef.current.onStart?.();
  }
  function move(id: number, y: number) {
    const d = st.current;
    if (!d || d.id !== id) return;
    const dy = y - d.startY;
    if (!d.moved && Math.abs(dy) < 6) return;
    d.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vy = 0.5 * d.vy + 0.5 * (((y - d.lastY) / dt) * 1000);
    d.lastY = y;
    d.lastT = now;
    optsRef.current.onMove(dy);
  }
  function end(id: number, y: number, target: EventTarget | null, cancelled: boolean) {
    const d = st.current;
    if (!d || d.id !== id) return;
    st.current = null;
    if (id !== TOUCH_ID) { try { d.el.releasePointerCapture(id); } catch { /* not captured */ } }
    if (d.moved) suppressUntil.current = performance.now() + 500;
    // A cancelled gesture (the browser took it — e.g. a sideways pan on a
    // pan-x chip rail) is NOT a drag: report it as unmoved so the sheet
    // settles back where it was instead of jumping to a detent.
    optsRef.current.onEnd({
      dy: cancelled ? 0 : y - d.startY,
      vy: cancelled ? 0 : d.vy,
      moved: cancelled ? false : d.moved,
      target: cancelled || d.moved ? null : target,
    });
  }

  const zoneProps = {
    onTouchStart(e: RTouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      begin(TOUCH_ID, t.clientY, e.currentTarget as HTMLElement);
    },
    onTouchMove(e: RTouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      move(TOUCH_ID, t.clientY);
    },
    onTouchEnd(e: RTouchEvent) {
      const t = e.changedTouches[0];
      end(TOUCH_ID, t ? t.clientY : (st.current?.lastY ?? 0), e.target, false);
    },
    onTouchCancel(e: RTouchEvent) {
      const t = e.changedTouches[0];
      end(TOUCH_ID, t ? t.clientY : (st.current?.lastY ?? 0), e.target, true);
    },
    onPointerDown(e: RPointerEvent) {
      if (e.pointerType === "touch") return; // fingers use the touch handlers
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      begin(e.pointerId, e.clientY, el);
    },
    onPointerMove(e: RPointerEvent) {
      if (e.pointerType === "touch") return;
      move(e.pointerId, e.clientY);
    },
    onPointerUp(e: RPointerEvent) { if (e.pointerType !== "touch") end(e.pointerId, e.clientY, e.target, false); },
    onPointerCancel(e: RPointerEvent) { if (e.pointerType !== "touch") end(e.pointerId, e.clientY, e.target, true); },
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
