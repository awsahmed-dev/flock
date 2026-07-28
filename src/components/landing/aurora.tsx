"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * Landing v4.1 — pointer-reactive aurora.
 *
 * Three soft-blurred blobs in the app's hues that (a) keep their slow
 * ambient drift and (b) lean toward/away from the cursor with springy
 * parallax — nearer blobs move more, the far one moves against the
 * cursor for depth. Listens on window pointermove; springs keep it
 * buttery and it degrades to pure drift on touch devices.
 */
export function HeroAurora() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  // normalized cursor offset from viewport center, spring-smoothed
  const sx = useSpring(mx, { stiffness: 50, damping: 20 });
  const sy = useSpring(my, { stiffness: 50, damping: 20 });

  useEffect(() => {
    function onMove(e: PointerEvent) {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  // layered depths: foreground follows the cursor, background counters it
  const nearX = useSpring(mx, { stiffness: 40, damping: 18 });
  const nearY = useSpring(my, { stiffness: 40, damping: 18 });
  const nX = useTransform(nearX, (n) => n * 70);
  const nY = useTransform(nearY, (n) => n * 50);
  const mX = useTransform(sx, (n) => n * 40);
  const mY = useTransform(sy, (n) => n * 30);
  const fX = useTransform(sx, (n) => n * -25);
  const fY = useTransform(sy, (n) => n * -18);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none [mask-image:radial-gradient(80%_60%_at_50%_30%,black_30%,transparent_80%)]"
    >
      {/* near blob — brand, follows cursor strongly */}
      <motion.div
        className="absolute -top-32 left-1/4 w-[42rem] h-[42rem] rounded-full bg-[#8B7CFF]/25 blur-[120px]"
        style={{ x: nX, y: nY }}
        animate={{ scale: [1, 1.06, 0.98, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* mid blob — wayfind, gentle follow */}
      <motion.div
        className="absolute -top-8 right-1/4 w-[36rem] h-[36rem] rounded-full bg-[#3EC5B7]/20 blur-[110px]"
        style={{ x: mX, y: mY }}
        animate={{ scale: [1, 0.96, 1.05, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* far blob — dune, counters the cursor for depth */}
      <motion.div
        className="absolute top-32 left-1/2 w-[32rem] h-[32rem] -translate-x-1/2 rounded-full bg-[#E0B252]/12 blur-[100px]"
        style={{ x: fX, y: fY }}
        animate={{ scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/**
 * Section-scoped color bleed. Used by feature sections so each carries
 * its own tint without changing the page background.
 */
export function SectionGlow({
  color,
  side = "left",
}: {
  /** Tailwind color e.g. "bg-[#8B7CFF]" — we tint it ourselves. */
  color: string;
  side?: "left" | "right";
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "-left-40" : "-right-40"} w-[42rem] h-[42rem] rounded-full ${color} opacity-[0.07] blur-[130px]`}
      />
    </div>
  );
}
