/**
 * Resolve the public origin of this app for building absolute URLs (invite
 * links, OAuth redirects, etc.).
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL — set explicitly via Vercel env vars (preferred)
 *   2. VERCEL_URL — auto-set by Vercel for every deployment
 *   3. Hard-coded production URL — last-resort fallback so links never
 *      become "undefined/invite/..." in production
 *
 * Why this exists: NEXT_PUBLIC_APP_URL was missing from the deployed env,
 * so generated invite URLs were rendering as "undefined/invite/<token>".
 */
/** Hard-coded production URL used as the last-resort fallback. */
const FALLBACK_URL = "https://flock-pi-six.vercel.app";

function isValidUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  // Defensive: reject the literal strings "undefined" / "null" which can
  // sneak in if someone typed them into the Vercel env var UI by mistake.
  const v = value.trim().toLowerCase();
  if (v === "undefined" || v === "null" || v === "") return false;
  return true;
}

export function getBaseUrl(): string {
  if (isValidUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    return process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  }
  if (isValidUrl(process.env.VERCEL_URL)) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return FALLBACK_URL;
}
