/**
 * authz-2: invite links used to be created with expiresAt = null — "never
 * expires" — so a link pasted once into any chat granted membership forever.
 * Share links are still multi-use by design (that IS the feature), but they
 * now expire after INVITE_TTL_DAYS; createTripInvite mints a fresh one on
 * demand once the old one lapses, so nothing changes for the crew.
 */
export const INVITE_TTL_DAYS = 30;
export function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

