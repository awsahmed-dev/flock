import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Forward-the-email: every trip has a private inbound address,
 *
 *   trip-<12 hex of tripId>-<8 hex HMAC>@<INBOUND_DOMAIN>
 *
 * The HMAC (secret INBOUND_SECRET, message = tripId) is what makes the address
 * unguessable; no table, no schema change. Anyone who has the address can add
 * bookings to that trip — the same trust as the invite link, and it can be
 * rotated by rotating the secret.
 */
export function inboundAddress(tripId: string): string | null {
  const secret = process.env.INBOUND_SECRET;
  const domain = process.env.INBOUND_DOMAIN;
  if (!secret || !domain) return null;
  const short = tripId.replace(/-/g, "").slice(0, 12);
  const mac = createHmac("sha256", secret).update(tripId).digest("hex").slice(0, 8);
  return `trip-${short}-${mac}@${domain}`;
}

/** Parse + verify an inbound address → { short, mac } or null. */
export function parseInboundAddress(addr: string): { short: string; mac: string } | null {
  const m = /^trip-([0-9a-f]{12})-([0-9a-f]{8})@/i.exec(addr.trim().toLowerCase());
  return m ? { short: m[1], mac: m[2] } : null;
}

export function verifyInbound(tripId: string, mac: string): boolean {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) return false;
  const expect = createHmac("sha256", secret).update(tripId).digest("hex").slice(0, 8);
  try { return timingSafeEqual(Buffer.from(expect), Buffer.from(mac.toLowerCase())); } catch { return false; }
}
