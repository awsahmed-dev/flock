/**
 * Telling two stays in the same city apart.
 *
 * "I'll be landing in Jeddah, stay five days, go to Riyadh for the rest,
 * then come back to Jeddah and fly home from there." Jeddah appears twice,
 * and until now it could not: the shape was a SET of stays, one row per
 * city, and the database enforced it.
 *
 * The fix is not to make the city id unique — that id is the city, and a
 * great deal depends on it staying the city. `arrive === depart` is how we
 * know a trip is a round trip and needs one ticket rather than two. The
 * city page, the reactions, and the cached Google ideas are all keyed by
 * it, and all of them are right to treat both Jeddah legs as Jeddah.
 *
 * So identity is derived instead of stored: the first stay in a city is
 * «jeddah», the second «jeddah#2». Nothing is written to the database that
 * was not there before, and every lookup that means "which city" keeps
 * working untouched. Only the things that mean "which stay" — the edit
 * ops, the React keys, the drag handles — use the key.
 */

/** The stay key for each segment, in order. */
export function stayKeys(baseIds: string[]): string[] {
  const seen = new Map<string, number>();
  return baseIds.map((id) => {
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    return n === 1 ? id : `${id}#${n}`;
  });
}

/** The city a stay key names, and which visit to it. */
export function parseStayKey(key: string): { baseId: string; occurrence: number } {
  // A custom base is «custom:<slug>» and a slug can hold almost anything,
  // so split on the LAST "#" and only when what follows is a number. A
  // city genuinely called "A#1" would otherwise lose its name.
  const at = key.lastIndexOf("#");
  if (at < 1) return { baseId: key, occurrence: 1 };
  const tail = key.slice(at + 1);
  if (!/^\d+$/.test(tail)) return { baseId: key, occurrence: 1 };
  return { baseId: key.slice(0, at), occurrence: parseInt(tail, 10) };
}

/** The city, with any visit marker removed. Safe on a plain base id. */
export function baseOfStay(key: string): string {
  return parseStayKey(key).baseId;
}

/**
 * The segment a stay key points at.
 *
 * Accepts a plain base id as the first visit, so every op that was written
 * before there could be two — and every client that has not reloaded —
 * keeps addressing the stay it always meant.
 */
export function findStay<T extends { baseId: string }>(segments: T[], key: string): T | undefined {
  const { baseId, occurrence } = parseStayKey(key);
  let n = 0;
  for (const s of segments) {
    if (s.baseId !== baseId) continue;
    if (++n === occurrence) return s;
  }
  return undefined;
}

/**
 * A stay key that can live in a URL path.
 *
 * «jeddah#2» cannot: everything from the "#" onward is a fragment and
 * never reaches the server, so the return leg's page would silently open
 * the arrival's. Percent-encoding would work in theory, but a colon in
 * this same position already cost us every typed city's city page, so
 * the character simply does not go into the path.
 */
export function stayParam(key: string): string {
  const { baseId, occurrence } = parseStayKey(key);
  return occurrence > 1 ? `${baseId}~${occurrence}` : baseId;
}

/** The stay key a URL segment names. Accepts a plain city id. */
export function stayFromParam(param: string): string {
  const m = /^(.*)~(\d+)$/.exec(param);
  return m ? `${m[1]}#${m[2]}` : param;
}
