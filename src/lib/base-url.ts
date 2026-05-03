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
/**
 * Always-known production URL. Hard-coded because env-var-based resolution
 * proved unreliable (NEXT_PUBLIC_APP_URL was either unset or literally the
 * string "undefined" on the deployed Vercel project, which produced broken
 * "undefined/invite/<token>" links).
 */
const PRODUCTION_URL = "https://flock-pi-six.vercel.app";

function isValidUrl(value: string | undefined | null): value is string {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (v === "undefined" || v === "null" || v === "") return false;
  return true;
}

export function getBaseUrl(): string {
  // Prefer the explicit env var if it's a real, valid value (lets staging
  // builds override). But default to the known production URL — never to
  // an env-var-derived fallback that might be missing or malformed.
  if (isValidUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    return process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  }
  return PRODUCTION_URL;
}
