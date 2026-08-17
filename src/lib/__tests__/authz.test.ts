/**
 * Authorization regression tests.
 *
 * Every case models the same real attack: the attacker creates their OWN trip
 * (which makes them `role: "owner"` — trips.ts:98), then calls an action with
 * `tripId` = their trip and an object id copied out of the victim trip's own
 * network responses. Before the fix each of these succeeded, because
 * `getTripWithMembership` authorizes the trip PARAMETER, not the OBJECT.
 *
 * These run against a real Postgres (DATABASE_URL). Skipped when unset.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { profiles, trips, tripMembers, expenses, expenseSplits, votes, voteOptions, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VICTIM = "00000000-0000-0000-0000-0000000000a1";
const ATTACKER = "00000000-0000-0000-0000-000000000001"; // == DEV_USER: the attacker is genuinely authorized on THEIR OWN trip
const VTRIP = "00000000-0000-0000-0000-0000000000b1";
const ATRIP = "00000000-0000-0000-0000-0000000000b2";
const EXP = "00000000-0000-0000-0000-0000000000c1";
const SPLIT = "00000000-0000-0000-0000-0000000000c2";
const VOTE = "00000000-0000-0000-0000-0000000000c3";
const DOC = "00000000-0000-0000-0000-0000000000c4";

// These tests are only meaningful when the actions can actually RUN. Two
// preconditions, both verified by execution against a clean Postgres:
//
//  1. DATABASE_URL — without it nothing can be seeded. Silently skipping
//     here made `vitest run` green while proving nothing (the CI trap).
//  2. NEXT_PUBLIC_SUPABASE_URL/ANON_KEY — get-user.ts constructs a Supabase
//     client BEFORE reaching the DEV_USER fallback. Without these, every
//     action throws "URL and Key are required" at auth setup, the
//     `rejects.toThrow()` assertions pass, and the IDOR suite is VACUOUS
//     (measured: 6/7 "pass" on unfixed main). With them: 7/7 fail on main,
//     7/7 pass on the fix — which is the claim this file exists to prove.
//
// So: fail loudly instead of skipping. A gate that passes by not running
// is worse than none.
const missing = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  .filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(
    `authz.test.ts: refusing to run without ${missing.join(", ")} — ` +
    `without them the IDOR assertions pass vacuously. Export them (or run via npm run test:authz).`,
  );
}
if (process.env.NODE_ENV !== "development") {
  throw new Error("authz.test.ts: NODE_ENV must be 'development' so get-user.ts falls back to DEV_USER (the attacker).");
}
const run = describe;

run("IDOR — attacker owns their own trip, targets the victim's rows", () => {
  beforeAll(async () => {
    await db.insert(profiles).values([
      { id: VICTIM, displayName: "Victim", email: "v@x.com" },
      { id: ATTACKER, displayName: "Attacker", email: "dev@flock.local" },
    ]).onConflictDoNothing();
    await db.insert(trips).values([
      { id: VTRIP, name: "Victim trip", destination: "Oslo", startDate: "2030-01-01", endDate: "2030-01-05", createdBy: VICTIM },
      { id: ATRIP, name: "Attacker trip", destination: "Lima", startDate: "2030-01-01", endDate: "2030-01-05", createdBy: ATTACKER },
    ]).onConflictDoNothing();
    // The amplifier: creating a trip makes you its owner.
    await db.insert(tripMembers).values([
      { tripId: VTRIP, userId: VICTIM, displayName: "Victim", role: "owner" },
      { tripId: ATRIP, userId: ATTACKER, displayName: "Attacker", role: "owner" },
    ]).onConflictDoNothing();
    await db.insert(expenses).values({
      id: EXP, tripId: VTRIP, title: "Victim's hotel", amount: 400, currency: "USD", paidBy: VICTIM, category: "accommodation", expenseDate: "2030-01-02",
    }).onConflictDoNothing();
    await db.insert(expenseSplits).values({ id: SPLIT, expenseId: EXP, userId: VICTIM, amountOwed: 200, settled: false }).onConflictDoNothing();
    await db.insert(votes).values({ id: VOTE, tripId: VTRIP, question: "Which hotel?", createdBy: VICTIM }).onConflictDoNothing();
    await db.insert(voteOptions).values({ voteId: VOTE, label: "The nice one" }).onConflictDoNothing();
    await db.insert(documents).values({ id: DOC, tripId: VTRIP, type: "hotel", url: "https://x/1.pdf", title: "Victim booking", uploadedBy: VICTIM }).onConflictDoNothing();
  });

  const fd = (o: Record<string, string>) => { const f = new FormData(); for (const k in o) f.set(k, o[k]); return f; };

  it("settleSplit cannot clear a debt in another trip", async () => {
    const { settleSplit } = await import("@/lib/actions/expenses");
    await expect(settleSplit(fd({ splitId: SPLIT, tripId: ATRIP }))).rejects.toThrow();
    const [row] = await db.select().from(expenseSplits).where(eq(expenseSplits.id, SPLIT));
    expect(row.settled).toBe(false);            // the row is genuinely untouched
  });

  it("deleteExpense cannot delete another trip's expense", async () => {
    const { deleteExpense } = await import("@/lib/actions/expenses");
    await expect(deleteExpense(fd({ expenseId: EXP, tripId: ATRIP }))).rejects.toThrow();
    expect((await db.select().from(expenses).where(eq(expenses.id, EXP))).length).toBe(1);
  });

  it("deleteVote cannot delete another trip's vote", async () => {
    const { deleteVote } = await import("@/lib/actions/votes");
    await expect(deleteVote(fd({ voteId: VOTE, tripId: ATRIP }))).rejects.toThrow();
    expect((await db.select().from(votes).where(eq(votes.id, VOTE))).length).toBe(1);
  });

  it("closeVote cannot close another trip's vote", async () => {
    const { closeVote } = await import("@/lib/actions/votes");
    await expect(closeVote(fd({ voteId: VOTE, tripId: ATRIP }))).rejects.toThrow();
    const [v] = await db.select().from(votes).where(eq(votes.id, VOTE));
    expect(v.status).toBe("open");
  });

  it("deleteDocument cannot delete another trip's document", async () => {
    const { deleteDocument } = await import("@/lib/actions/documents");
    await expect(deleteDocument(fd({ documentId: DOC, tripId: ATRIP }))).rejects.toThrow();
    expect((await db.select().from(documents).where(eq(documents.id, DOC))).length).toBe(1);
  });

  it("expireStaleDecisions is no longer callable unauthenticated", async () => {
    const { expireStaleDecisions } = await import("@/lib/actions/huddle");
    await expect(expireStaleDecisions(VTRIP)).rejects.toThrow();
  });

  it("togglePlaceLike cannot write into a trip you are not in", async () => {
    const { togglePlaceLike } = await import("@/lib/actions/place-likes");
    await expect(togglePlaceLike(VTRIP, "place_abc")).rejects.toThrow();
  });
});
