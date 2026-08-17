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
import { profiles, trips, tripMembers, expenses, expenseSplits, votes, voteOptions, documents, chatMessages, huddleDecisions, decisionReactions, threads, threadComments, itineraryItems, bookings, pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VICTIM = "00000000-0000-0000-0000-0000000000a1";
const ATTACKER = "00000000-0000-0000-0000-000000000001"; // == DEV_USER: the attacker is genuinely authorized on THEIR OWN trip
const VTRIP = "00000000-0000-0000-0000-0000000000b1";
const ATRIP = "00000000-0000-0000-0000-0000000000b2";
const EXP = "00000000-0000-0000-0000-0000000000c1";
const SPLIT = "00000000-0000-0000-0000-0000000000c2";
const VOTE = "00000000-0000-0000-0000-0000000000c3";
const DOC = "00000000-0000-0000-0000-0000000000c4";
// authz-2 fixtures — all in the VICTIM's trip
const MSG_EXP = "00000000-0000-0000-0000-0000000000d1"; // expense_card
const MSG_VOTE = "00000000-0000-0000-0000-0000000000d2"; // vote_card
const MSG_LINK = "00000000-0000-0000-0000-0000000000d3"; // link_card
const MSG_TEXT = "00000000-0000-0000-0000-0000000000d4"; // plain
const DEC_SUG = "00000000-0000-0000-0000-0000000000d5"; // suggestion decision
const DEC_POLL = "00000000-0000-0000-0000-0000000000d6"; // poll decision
const THREAD = "00000000-0000-0000-0000-0000000000d7";
const COMMENT = "00000000-0000-0000-0000-0000000000d8";
const STOP = "00000000-0000-0000-0000-0000000000d9";
const BOOKING = "00000000-0000-0000-0000-0000000000da";
const VICTIM_ENDPOINT = "https://push.example/victim-device";

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
    // authz-2
    await db.insert(chatMessages).values([
      { id: MSG_EXP, tripId: VTRIP, userId: VICTIM, type: "expense_card", metadata: { amount: 90, currency: "USD", description: "Victim dinner", category: "food" } },
      { id: MSG_VOTE, tripId: VTRIP, userId: VICTIM, type: "vote_card", metadata: { question: "Sushi or ramen?", options: ["Sushi", "Ramen"] } },
      { id: MSG_LINK, tripId: VTRIP, userId: VICTIM, type: "link_card", metadata: { url: "https://example.com/x", siteName: "Example" } },
      { id: MSG_TEXT, tripId: VTRIP, userId: VICTIM, type: "text", body: "hello crew" },
    ]).onConflictDoNothing();
    await db.insert(huddleDecisions).values([
      { id: DEC_SUG, tripId: VTRIP, type: "suggestion", status: "open", createdBy: VICTIM },
      { id: DEC_POLL, tripId: VTRIP, type: "poll", status: "open", createdBy: VICTIM, pollQuestion: "Beach day?", pollOptions: [{ id: "a", label: "Yes", voterIds: [] }, { id: "b", label: "No", voterIds: [] }] },
    ]).onConflictDoNothing();
    await db.insert(threads).values({ id: THREAD, tripId: VTRIP, entityType: "day", entityId: "2030-01-02" }).onConflictDoNothing();
    await db.insert(threadComments).values({ id: COMMENT, threadId: THREAD, userId: VICTIM, content: "nice", tapbacks: {} }).onConflictDoNothing();
    await db.insert(itineraryItems).values({ id: STOP, tripId: VTRIP, dayDate: "2030-01-02", title: "Victim hotel", createdBy: VICTIM }).onConflictDoNothing();
    await db.insert(bookings).values({ id: BOOKING, stopId: STOP, bookingType: "stay", confirmationNumber: "ORIGINAL" }).onConflictDoNothing();
    await db.insert(pushSubscriptions).values({ userId: VICTIM, endpoint: VICTIM_ENDPOINT, p256dh: "k", auth: "a" }).onConflictDoNothing();
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

  // ── authz-2: the second batch ─────────────────────────────────────────────

  it("togglePin cannot pin another trip's message", async () => {
    const { togglePin } = await import("@/lib/actions/chat");
    await expect(togglePin(fd({ messageId: MSG_TEXT, tripId: ATRIP }))).rejects.toThrow();
    const [m] = await db.select().from(chatMessages).where(eq(chatMessages.id, MSG_TEXT));
    expect(m.pinned).toBe(false);
  });

  it("toggleReaction cannot react to another trip's message", async () => {
    const { toggleReaction } = await import("@/lib/actions/chat");
    await expect(toggleReaction(fd({ messageId: MSG_TEXT, tripId: ATRIP, emoji: "🔥" }))).rejects.toThrow();
  });

  it("confirmExpenseCard cannot consume another trip's expense card", async () => {
    const { confirmExpenseCard } = await import("@/lib/actions/chat");
    await expect(confirmExpenseCard(fd({ messageId: MSG_EXP, tripId: ATRIP }))).rejects.toThrow();
    const [m] = await db.select().from(chatMessages).where(eq(chatMessages.id, MSG_EXP));
    expect((m.metadata as { confirmedExpenseId?: string }).confirmedExpenseId).toBeUndefined();
    expect((await db.select().from(expenses).where(eq(expenses.tripId, ATRIP))).length).toBe(0);
  });

  it("confirmVoteCard cannot consume another trip's vote card", async () => {
    const { confirmVoteCard } = await import("@/lib/actions/chat");
    await expect(confirmVoteCard(fd({ messageId: MSG_VOTE, tripId: ATRIP, options: JSON.stringify(["a", "b"]) }))).rejects.toThrow();
    const [m] = await db.select().from(chatMessages).where(eq(chatMessages.id, MSG_VOTE));
    expect((m.metadata as { voteId?: string }).voteId).toBeUndefined();
  });

  it("confirmLinkToItinerary / confirmLinkToVote cannot consume another trip's link card", async () => {
    const { confirmLinkToItinerary, confirmLinkToVote } = await import("@/lib/actions/chat");
    await expect(confirmLinkToItinerary(fd({ messageId: MSG_LINK, tripId: ATRIP, title: "x", dayDate: "2030-01-02" }))).rejects.toThrow();
    await expect(confirmLinkToVote(fd({ messageId: MSG_LINK, tripId: ATRIP, question: "q" }))).rejects.toThrow();
    const [m] = await db.select().from(chatMessages).where(eq(chatMessages.id, MSG_LINK));
    expect((m.metadata as { confirmedAction?: string }).confirmedAction).toBeUndefined();
  });

  it("reactToDecision cannot react on another trip's decision", async () => {
    const { reactToDecision } = await import("@/lib/actions/huddle");
    await expect(reactToDecision(DEC_SUG, ATRIP, "add_it")).rejects.toThrow();
    expect((await db.select().from(decisionReactions).where(eq(decisionReactions.decisionId, DEC_SUG))).length).toBe(0);
  });

  it("votePoll cannot vote in another trip's poll", async () => {
    const { votePoll } = await import("@/lib/actions/huddle");
    await expect(votePoll(DEC_POLL, ATRIP, "a")).rejects.toThrow();
    const [d] = await db.select().from(huddleDecisions).where(eq(huddleDecisions.id, DEC_POLL));
    const opts = d.pollOptions as { id: string; voterIds: string[] }[];
    expect(opts.find((o) => o.id === "a")!.voterIds).toEqual([]);
  });

  it("toggleTapback cannot react to a comment in another trip's thread", async () => {
    const { toggleTapback } = await import("@/lib/actions/threads");
    await expect(toggleTapback(ATRIP, COMMENT, "❤️")).rejects.toThrow();
    const [c] = await db.select().from(threadComments).where(eq(threadComments.id, COMMENT));
    expect(c.tapbacks).toEqual({});
  });

  it("updateBooking cannot rewrite another trip's booking via its stopId", async () => {
    const { updateBooking } = await import("@/lib/actions/bookings");
    await expect(updateBooking({ tripId: ATRIP, stopId: STOP, confirmationNumber: "PWNED" })).rejects.toThrow();
    const [b] = await db.select().from(bookings).where(eq(bookings.id, BOOKING));
    expect(b.confirmationNumber).toBe("ORIGINAL");
  });

  it("getTasteContext does not leak another trip's crew vectors", async () => {
    const { getTasteContext } = await import("@/lib/actions/taste");
    await expect(getTasteContext(VTRIP)).rejects.toThrow();
  });

  it("removeMember: a non-owner of the victim trip cannot remove its members", async () => {
    const { removeMember } = await import("@/lib/actions/members");
    await expect(removeMember(VTRIP, VICTIM)).rejects.toThrow();
    expect((await db.select().from(tripMembers).where(eq(tripMembers.tripId, VTRIP))).length).toBe(1);
  });

  it("push DELETE only removes the caller's own subscription", async () => {
    const { DELETE } = await import("@/app/api/push/subscribe/route");
    const req = new Request("http://localhost/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: VICTIM_ENDPOINT }), headers: { "content-type": "application/json" } });
    // NextRequest is structurally a Request for what the handler reads.
    await DELETE(req as never);
    expect((await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, VICTIM_ENDPOINT))).length).toBe(1);
  });

  it("invite links are created with an expiry, not forever", async () => {
    const { createTripInvite } = await import("@/lib/actions/invite");
    await createTripInvite(ATRIP);
    const { tripInvites } = await import("@/lib/db/schema");
    const [inv] = await db.select().from(tripInvites).where(eq(tripInvites.tripId, ATRIP));
    expect(inv.expiresAt).not.toBeNull();
  });
});
