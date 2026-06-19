/**
 * Paxawa v2 — discovery feature flag.
 *
 * Gates the v2 surfaces that touch a flow current testers use (the Plan
 * "Add place" rebuild, the Plan `Days | Discover` weave) so they stay invisible
 * until proven. `NEXT_PUBLIC_` so both server and client read the same value.
 *
 * Default OFF: an unset env means testers keep today's behavior — the safe
 * default. Flip `NEXT_PUBLIC_DISCOVERY_ENABLED=true` (Vercel env) to light it up.
 *
 * The standalone `/trips/[id]/discover` preview route is intentionally NOT gated
 * here — it's URL-only (not in nav) and is being replaced in Phase 3 anyway.
 */
export function isDiscoveryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DISCOVERY_ENABLED === "true";
}
