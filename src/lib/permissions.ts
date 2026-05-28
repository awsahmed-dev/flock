/**
 * Single source of truth for trip role gates (B2-3).
 *
 * Mental model:
 *   - **Owner** = the trip creator (or anyone the owner promotes later).
 *     Can edit trip settings, delete the trip, delete *any* content,
 *     and remove members.
 *   - **Member** = invited traveler. Can create content (itinerary,
 *     votes, expenses, packing, docs), edit content *they* created,
 *     vote, settle their own splits, chat.
 *
 * The deliberate non-gates: status changes (proposed/confirmed/rejected)
 * and sort-ordering on itinerary items stay open to all members — those
 * are *group* decisions, not edits. Same for casting votes and uploading
 * docs.
 *
 * Every helper takes a "trip-with-members" shape so callers don't run
 * extra queries; they already have it from getTripWithMembership.
 */

interface TripMemberLike {
  userId: string;
  role: "owner" | "member";
}
interface TripLike {
  members: TripMemberLike[];
}

/** True iff `userId` is an owner on this trip. */
export function isOwner(trip: TripLike, userId: string): boolean {
  return trip.members.some((m) => m.userId === userId && m.role === "owner");
}

/** True iff `userId` is any kind of member on this trip. */
export function isMember(trip: TripLike, userId: string): boolean {
  return trip.members.some((m) => m.userId === userId);
}

/** Owner-only: trip settings (name, dates, currency, budget). */
export function canEditTrip(trip: TripLike, userId: string): boolean {
  return isOwner(trip, userId);
}

/** Owner-only: trip deletion, member removal. */
export function canManageMembers(trip: TripLike, userId: string): boolean {
  return isOwner(trip, userId);
}

/**
 * Generic content gate — true if user is the creator of `item` or an
 * owner. Use for itinerary items, votes, expenses, documents, etc.
 */
export function canManageItem(
  item: { createdBy?: string | null; paidBy?: string | null },
  trip: TripLike,
  userId: string,
): boolean {
  const creator = item.createdBy ?? item.paidBy ?? null;
  if (creator === userId) return true;
  return isOwner(trip, userId);
}

/**
 * Permission error thrown by server actions when a gate fails. We use a
 * dedicated class so the client can render a friendlier toast — "Only
 * the trip owner can do that" instead of a generic 500.
 */
export class PermissionError extends Error {
  constructor(message = "You don't have permission to do that") {
    super(message);
    this.name = "PermissionError";
  }
}
