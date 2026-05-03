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
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://flock-pi-six.vercel.app";
}
