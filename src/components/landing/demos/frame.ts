/**
 * Scroll-scene frames. A demo can run in two modes:
 *  - free (progress === undefined): items reveal once on viewport entry
 *    (the classic whileInView behavior — used by the main landing).
 *  - scrubbed (progress 0..1): the vision page pins the chapter and
 *    feeds scroll progress in; each item appears when progress crosses
 *    its threshold and retreats when scrolled back — Apple-style.
 */
import type { TargetAndTransition } from "motion/react";

export function frame(
  progress: number | undefined,
  threshold: number,
  hidden: TargetAndTransition,
  visible: TargetAndTransition,
  delay = 0,
) {
  if (progress === undefined) {
    return {
      initial: hidden,
      whileInView: visible,
      viewport: { once: true as const },
      transition: { duration: 0.5, delay },
    };
  }
  return {
    initial: false as const,
    animate: progress >= threshold ? visible : hidden,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  };
}

/** Scrub a 0..1 progress into a sub-range, clamped. */
export function seg(progress: number | undefined, from: number, to: number): number {
  if (progress === undefined) return 1;
  return Math.min(1, Math.max(0, (progress - from) / (to - from)));
}
