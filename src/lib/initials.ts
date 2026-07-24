/**
 * Avatar initials from a display name: first character of the first two
 * words, Unicode-safe (works for Arabic, emoji-decorated names, etc.).
 * Always derive initials from the person's REAL name — never from a
 * localized label like "أنت"/"You", which slices into nonsense ("أن").
 */
export function initials(name: string | null | undefined, fallback = "?"): string {
  const s = (name ?? "").trim();
  if (!s) return fallback;
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => [...w][0])
    .join("")
    .toUpperCase();
}
