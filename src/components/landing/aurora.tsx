"use client";

import { motion } from "motion/react";

/**
 * Slow-drifting aurora background. Three soft-blurred radial blobs in
 * indigo / violet / fuchsia that gently pan around. Sits absolutely
 * behind the hero content (mix-blend so it doesn't wash out text on
 * pure black) and is `pointer-events-none` so it doesn't block clicks.
 *
 * Intentionally subtle. We want color to be felt, not announced.
 */
export function HeroAurora() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none [mask-image:radial-gradient(80%_60%_at_50%_30%,black_30%,transparent_80%)]"
    >
      <motion.div
        className="absolute -top-32 left-1/4 w-[42rem] h-[42rem] rounded-full bg-[#8B7CFF]/25 blur-[120px]"
        animate={{
          x: [0, 60, -40, 0],
          y: [0, 30, -20, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-8 right-1/4 w-[36rem] h-[36rem] rounded-full bg-[#3EC5B7]/20 blur-[110px]"
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, 0, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-32 left-1/2 w-[32rem] h-[32rem] -translate-x-1/2 rounded-full bg-[#E0B252]/12 blur-[100px]"
        animate={{
          x: [0, 40, -40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/**
 * Section-scoped color bleed. Used in scrollytelling so each feature
 * carries its own tint without changing the page background. Big soft
 * blob anchored to the left edge.
 */
export function SectionGlow({
  color,
  side = "left",
}: {
  /** Tailwind color e.g. "bg-blue-500" — we tint it ourselves. */
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
