"use client";

import { useRef, useState } from "react";

/**
 * Sprint 8 Item 1 — pointer-event pinch-zoom/pan for the document viewer.
 * Two pointers pinch (scale 1–5), one pointer pans when zoomed in,
 * double-tap toggles 1 ↔ 2.5. When NOT zoomed, horizontal single-pointer
 * drags are handed to `onSwipe` so the viewer can page between docs.
 */
export function PinchZoom({
  onSwipe,
  children,
}: {
  onSwipe?: (dir: 1 | -1) => void;
  children: React.ReactNode;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  // Mirrors "any pointers down" as state — render can't read the ref.
  const [interacting, setInteracting] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);

  function dist() {
    const pts = [...pointers.current.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setInteracting(true);
    if (pointers.current.size === 2) {
      pinchStart.current = { dist: dist(), scale };
      panStart.current = null;
      swipeStart.current = null;
    } else if (pointers.current.size === 1) {
      if (scale > 1) panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
      else swipeStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      // Double-tap zoom toggle.
      const now = Date.now();
      if (now - lastTap.current < 300) {
        const next = scale > 1 ? 1 : 2.5;
        setScale(next);
        if (next === 1) {
          setTx(0);
          setTy(0);
        }
        swipeStart.current = null;
      }
      lastTap.current = now;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const next = Math.min(5, Math.max(1, (pinchStart.current.scale * dist()) / pinchStart.current.dist));
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
    } else if (pointers.current.size === 1 && panStart.current) {
      setTx(panStart.current.tx + (e.clientX - panStart.current.x));
      setTy(panStart.current.ty + (e.clientY - panStart.current.y));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      setInteracting(false);
      panStart.current = null;
      const s = swipeStart.current;
      swipeStart.current = null;
      if (s && scale === 1 && onSwipe) {
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        const fast = Date.now() - s.t < 600;
        if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.5 && fast) {
          onSwipe(dx < 0 ? 1 : -1);
        }
      }
    }
  }

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{ touchAction: scale > 1 ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="w-full h-full"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: interacting ? "none" : "transform 120ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
