/**
 * §10.6: derive a browse-friendly locality from a raw Google address.
 *
 * Feed cards must never leak database rows like
 * "Japan, 〒160-0022 Tokyo, Shinjuku City, Shinjuku, 3-chōme−23−1 2 Pandora
 * Building, B1" — nobody browsing for inspiration needs a postal code. This
 * boils that down to "Shinjuku". The full address stays available in the
 * detail drawer.
 *
 * Heuristic: split on commas, drop tokens carrying digits or postal marks
 * (street numbers, zips, 〒), drop the country token (first token in JP-style
 * addresses, last in Western-style), then take the most specific remaining
 * token (the last one — Google orders general → specific in JP format and
 * specific → general in Western, but after stripping the country the last
 * clean token is the neighborhood/locality in both).
 */
export function shortLocality(address: string | null | undefined): string | null {
  if (!address) return null;
  const tokens = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) return null;
  if (tokens.length === 1) return /[0-9〒]/.test(tokens[0]) ? null : tokens[0];

  let clean = tokens.filter((tk) => !/[0-9〒]/.test(tk));
  if (tokens.length >= 3) {
    // Country sits at one end; drop both ends' candidates from the pool.
    clean = clean.filter((tk) => tk !== tokens[0] && tk !== tokens[tokens.length - 1]);
  }
  if (clean.length === 0) return null;
  return clean[clean.length - 1];
}
