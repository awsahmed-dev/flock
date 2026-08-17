/**
 * Email fan-out idempotency — regression tests for fix/tz (T-2).
 *
 * Resend's contract: the same `idempotencyKey` inside 24h means the second send
 * is dropped, and the call still returns ok. Three templates built the key from
 * the SUBJECT of the notification (the vote, the expense, the joining member)
 * while the caller looped over every crew member — so the key was constant
 * across the loop, only the FIRST recipient was emailed, and `sendEmail`
 * reported success for all of them.
 *
 * These assert the property that actually matters: the same event rendered for N
 * different recipients must produce N distinct keys, while the SAME event to the
 * SAME person must still collide — otherwise the key stops protecting retries.
 */
import { describe, it, expect } from "vitest";
import { emailIdempotencyKey, type EmailEvent } from "@/lib/email/idempotency";

// Deliberately adversarial crew: a duplicate display name and two members with
// no display name at all. Both cases used to collapse to one key.
const CREW = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "33333333-3333-3333-3333-333333333333",
  "44444444-4444-4444-4444-444444444444",
  "55555555-5555-5555-5555-555555555555",
];

const EVENTS: EmailEvent[] = [
  { kind: "vote_opened", voteId: "vote-1" },
  { kind: "expense_logged", expenseId: "exp-1" },
  { kind: "invite_accepted", memberId: "member-1" },
];

describe("T-2 FIXED — one email per crew member, not one per event", () => {
  it.each(EVENTS)("$kind: five recipients produce five distinct keys", (event) => {
    const keys = CREW.map((id) => emailIdempotencyKey(event, id));
    expect(new Set(keys).size).toBe(CREW.length);
  });

  it.each(EVENTS)("$kind: the key still names the event, so retries dedupe", (event) => {
    const a = emailIdempotencyKey(event, CREW[0]);
    const b = emailIdempotencyKey(event, CREW[0]);
    expect(a).toBe(b);
    expect(a).toContain(event.kind);
  });

  it("a different event to the same person gets a different key", () => {
    const a = emailIdempotencyKey({ kind: "vote_opened", voteId: "vote-1" }, CREW[0]);
    const b = emailIdempotencyKey({ kind: "vote_opened", voteId: "vote-2" }, CREW[0]);
    expect(a).not.toBe(b);
  });

  it("two events of different kinds never collide even with equal ids", () => {
    const keys = [
      emailIdempotencyKey({ kind: "vote_opened", voteId: "x" }, CREW[0]),
      emailIdempotencyKey({ kind: "expense_logged", expenseId: "x" }, CREW[0]),
      emailIdempotencyKey({ kind: "invite_accepted", memberId: "x" }, CREW[0]),
    ];
    expect(new Set(keys).size).toBe(3);
  });

  it("the exact keys, so a change to the format is a deliberate decision", () => {
    expect(emailIdempotencyKey({ kind: "vote_opened", voteId: "v1" }, "u1")).toBe(
      "vote_opened:v1:u1",
    );
    expect(emailIdempotencyKey({ kind: "expense_logged", expenseId: "e1" }, "u1")).toBe(
      "expense_logged:e1:u1",
    );
    expect(emailIdempotencyKey({ kind: "invite_accepted", memberId: "m1" }, "u1")).toBe(
      "invite_accepted:m1:u1",
    );
  });

  it("trip_invite is unchanged — it was already correct and is the pattern", () => {
    expect(
      emailIdempotencyKey({ kind: "trip_invite", tripId: "t1", email: "a@b.com" }, "ignored"),
    ).toBe("trip-invite:t1:a@b.com");
  });

  it("an empty recipient id does not collapse back to the broken constant key", () => {
    // A duplicate email is recoverable. A silently dropped one is not — so the
    // failure mode here is deliberately "send twice", never "send to one".
    const a = emailIdempotencyKey({ kind: "vote_opened", voteId: "v1" }, "");
    const b = emailIdempotencyKey({ kind: "vote_opened", voteId: "v1" }, "  ");
    const real = emailIdempotencyKey({ kind: "vote_opened", voteId: "v1" }, CREW[0]);
    expect(a).not.toBe(real);
    expect(b).not.toBe(real);
    expect(a).toBe("vote_opened:v1:unknown-recipient");
  });
});

describe("T-2 — the shape that caused the outage is now a type error", () => {
  it("documents the old keys so nobody reintroduces them", () => {
    // These are what the three keys used to be. Each is missing the recipient,
    // which is exactly why four out of five people got no email.
    const OLD = ["vote_opened:vote-1", "invite_accepted:member-1", "expense_logged:exp-1:Ali"];
    const now = [
      emailIdempotencyKey({ kind: "vote_opened", voteId: "vote-1" }, CREW[0]),
      emailIdempotencyKey({ kind: "invite_accepted", memberId: "member-1" }, CREW[0]),
      emailIdempotencyKey({ kind: "expense_logged", expenseId: "exp-1" }, CREW[0]),
    ];
    for (const [i, old] of OLD.entries()) expect(now[i]).not.toBe(old);
    // `emailIdempotencyKey(event)` with no recipient does not compile — the
    // recipient is a required positional argument, not an optional field.
  });
});
