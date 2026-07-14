/**
 * The 10-color day palette. Route lines, map pins, and day-chip dots share
 * these so "Day 2" reads as the same color everywhere.
 *
 * Design-review Page 8: values are the hue-400 steps of the design-system
 * ramps (Figma "Paxawa Design System" Page 1 / globals.css :root), replacing
 * the pre-palette raw hexes — near-identical hues, and each day color now
 * has a full ramp behind it (tints, text-safe 600s). Done pins use moss
 * (var(--clr-moss)), not Apple's #34C759.
 */
export const DAY_COLORS = [
  "#FF6B5E", // Day 1: red-400 (coral)
  "#6BA6FF", // Day 2: blue-400 (sky)
  "#E0B252", // Day 3: yellow-400 (warm)
  "#9BC97E", // Day 4: green-400 (fresh)
  "#FF8A5C", // Day 5: orange-400
  "#6E7BFF", // Day 6: indigo-400
  "#F07BB7", // Day 7: pink-400
  "#3EC5B7", // Day 8: teal-400
  "#92BDFF", // Day 9: blue-300 (light)
  "#B2D699", // Day 10: green-300 (lime)
] as const;

export function getDayColor(dayIndex: number): string {
  return DAY_COLORS[((dayIndex % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
}
