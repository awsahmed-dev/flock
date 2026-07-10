/**
 * Visual-fix brief FIX 5 — the 10-color day palette. Route lines, map pins
 * and day-rail chips share these so "Day 2" reads as the same color
 * everywhere. Done pins override with #34C759; booking anchors with coral.
 */
export const DAY_COLORS = [
  "#FF6B6B", // Day 1: coral red
  "#4D96FF", // Day 2: sky blue
  "#FFD93D", // Day 3: warm yellow
  "#6BCB77", // Day 4: fresh green
  "#FF922B", // Day 5: orange
  "#CC5DE8", // Day 6: violet
  "#F06595", // Day 7: pink
  "#20C997", // Day 8: mint
  "#74C0FC", // Day 9: light blue
  "#A9E34B", // Day 10: lime
] as const;

export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[((dayIndex % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
}
