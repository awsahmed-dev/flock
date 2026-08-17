/**
 * Idempotency keys for outbound email.
 *
 * THE BUG THESE EXIST TO PREVENT
 *
 * Resend's contract is: the same `idempotencyKey` inside 24h means the second
 * send is dropped — and the call still returns `ok: true`. Three templates built
 * their key from the SUBJECT of the notification while the caller looped over
 * every crew member:
 *
 *   vote_opened:<voteId>              — constant across the loop in votes.ts
 *   invite_accepted:<memberId>        — memberId is the JOINER, not the reader
 *   expense_logged:<expenseId>:<displayName>
 *
 * So on a 5-person trip, exactly ONE crew member was emailed about a new vote.
 * The other three got nothing, silently, and every call reported success. The
 * per-recipient locale work in those same loops was dead effort for the same
 * reason.
 *
 * The third is subtler and was already half-broken: keying on a *display name*
 * collides whenever two debtors are both called "Ali" or "Mom", and collides far
 * more readily via the `"there"` fallback — any two members missing both
 * `tripMembers.displayName` and `profiles.displayName` share a key.
 *
 * THE RULE
 *
 * A key identifies **(event, recipient)**. Both halves are required:
 *   - drop the event and a retry of a different notification gets deduped;
 *   - drop the recipient and the fan-out silently emails one person.
 *
 * `lib/actions/trips.ts:147` already got this right —
 * `trip-invite:${trip.id}:${email}` — and is the pattern these follow.
 *
 * These are plain string builders with no `server-only` import, so they are
 * unit-testable without a Next runtime. That is deliberate: the previous keys
 * were inline template literals inside a `.tsx` email template that could not be
 * imported by a test at all, which is why the bug survived.
 */

/** An email event, scoped to whatever it is about. */
export type EmailEvent =
  | { kind: "vote_opened"; voteId: string }
  | { kind: "expense_logged"; expenseId: string }
  | { kind: "invite_accepted"; memberId: string }
  | { kind: "trip_invite"; tripId: string; email: string };

/**
 * The key for one notification to one person.
 *
 * `recipientUserId` is a required positional argument rather than an optional
 * field, so the compiler rejects the shape that caused the outage.
 */
export function emailIdempotencyKey(event: EmailEvent, recipientUserId: string): string {
  const recipient = recipientUserId.trim();
  // An empty recipient would collapse back to the broken constant key. Better to
  // produce an obviously-unique key than to silently suppress mail: worst case
  // is a duplicate email, which is recoverable; a silently dropped one is not.
  const scope = recipient.length > 0 ? recipient : `unknown-recipient`;

  switch (event.kind) {
    case "vote_opened":
      return `vote_opened:${event.voteId}:${scope}`;
    case "expense_logged":
      return `expense_logged:${event.expenseId}:${scope}`;
    case "invite_accepted":
      return `invite_accepted:${event.memberId}:${scope}`;
    case "trip_invite":
      // Pre-existing and already correct — kept here so every key in the app is
      // built in one place and the pattern is visible side by side.
      return `trip-invite:${event.tripId}:${event.email}`;
  }
}
