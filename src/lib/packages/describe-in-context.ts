/**
 * Drop the city from a description when the screen already says it.
 *
 * Every `what` line names its city, because a place has to be legible on
 * its own — in a search result, in a shared plan, in a list that spans a
 * whole country. But on the city board, under a heading that reads
 * «لشبونة», five stops in a row ending «في لشبونة» stop being reassurance
 * and start being noise the eye skips, which defeats the point of the line
 * existing at all.
 *
 * So the trailing clause comes off, and only when it is unambiguously the
 * heading's own city. Anything cleverer — stripping a district, guessing at
 * a synonym — risks cutting the one word that made the sentence useful.
 */

/** Ends we are willing to remove, in both languages. */
function trailingCityClause(city: string): RegExp[] {
  const c = city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    // "… , in Lisbon." / "… in Lisbon."
    new RegExp(`(,)?\\s+in\\s+${c}\\s*\\.$`, "i"),
    // "… في لشبونة." / "… ، في لشبونة."
    new RegExp(`(،)?\\s*في\\s+${c}\\s*\\.$`),
    // "… بلشبونة." — the preposition fused to the name, as Arabic does
    new RegExp(`(،)?\\s*ب${c}\\s*\\.$`),
  ];
}

/**
 * `text` with its trailing "in <city>" removed, or unchanged when the
 * sentence does not end that way. The result always keeps its full stop.
 */
export function withoutCity(text: string | null | undefined, city: string | null | undefined): string {
  if (!text) return "";
  if (!city) return text;
  for (const re of trailingCityClause(city)) {
    if (re.test(text)) {
      const cut = text.replace(re, ".").trim();
      // Never cut a sentence down to nothing useful: "A museum." on its own
      // is worse than "A museum in Lisbon." under a Lisbon heading.
      if (cut.replace(/[.\s]/g, "").length >= 12) return cut;
    }
  }
  return text;
}
