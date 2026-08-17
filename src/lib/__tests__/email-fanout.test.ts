/**
 * Exercises ONE real email path end-to-end (createVote → notifyVoteOpened →
 * sendEmail) against a real Postgres, with only the Resend transport mocked.
 * Question: on a 4-person trip, how many DISTINCT idempotency keys reach the
 * transport? Resend drops repeats of the same key inside 24h.
 *
 * Measured, clean DB each run:
 *   main    → 3 sends, keys ["vote_opened:<voteId>"] ×3  → Resend delivers ONE
 *   fix/tz  → 3 sends, keys "vote_opened:<voteId>:<recipientUserId>" ×3 distinct
 *
 * DB-backed: needs DATABASE_URL + Supabase env + NODE_ENV=development (same
 * preconditions as authz.test.ts). Run via `npm run test:db`.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { db } from "@/lib/db";
import { profiles, trips, tripMembers } from "@/lib/db/schema";

const sendEmail = vi.fn(async (_p: unknown) => ({ ok: true }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (p: any) => sendEmail(p) }));
vi.mock("@/lib/push/send", () => ({ sendPush: async () => undefined }));
vi.mock("@/lib/inbox", () => ({ recordEvent: async () => undefined }));

const AUTHOR = "00000000-0000-0000-0000-000000000001"; // DEV_USER
const M = ["00000000-0000-0000-0000-0000000000e1","00000000-0000-0000-0000-0000000000e2","00000000-0000-0000-0000-0000000000e3"];
const TRIP = "00000000-0000-0000-0000-0000000000f1";

const missing = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter((k) => !process.env[k]);
if (missing.length) throw new Error(`email-fanout: missing ${missing.join(", ")}`);

describe("vote_opened email fan-out", () => {
  beforeAll(async () => {
    await db.insert(profiles).values([
      { id: AUTHOR, displayName: "Author", email: "dev@flock.local" },
      { id: M[0], displayName: "Ali", email: "ali1@x.com" },
      { id: M[1], displayName: "Ali", email: "ali2@x.com" },
      { id: M[2], displayName: "Sara", email: "sara@x.com" },
    ]).onConflictDoNothing();
    await db.insert(trips).values({ id: TRIP, name: "Fanout trip", destination: "Oslo", startDate: "2030-01-01", endDate: "2030-01-05", createdBy: AUTHOR }).onConflictDoNothing();
    await db.insert(tripMembers).values([
      { tripId: TRIP, userId: AUTHOR, displayName: "Author", role: "owner" },
      { tripId: TRIP, userId: M[0], displayName: "Ali", role: "member" },
      { tripId: TRIP, userId: M[1], displayName: "Ali", role: "member" },
      { tripId: TRIP, userId: M[2], displayName: "Sara", role: "member" },
    ] as any).onConflictDoNothing();
  });

  it("every other member gets their OWN idempotency key", async () => {
    const { createVote } = await import("@/lib/actions/votes");
    const fd = new FormData();
    fd.set("tripId", TRIP); fd.set("question", "Which hotel?");
    fd.set("option_label_0", "A"); fd.set("option_label_1", "B");
    try { await createVote(fd); } catch (e: any) { if (!String(e?.message ?? e).includes("NEXT_REDIRECT")) throw e; }
    // notify is fire-and-forget — wait for the loop to drain.
    for (let i = 0; i < 50 && sendEmail.mock.calls.length < 3; i++) await new Promise((r) => setTimeout(r, 100));

    const calls = sendEmail.mock.calls.map((c: any) => c[0]);
    const keys = calls.map((c) => c.idempotencyKey);
    console.log("[email-fanout] sends:", calls.length, "keys:", keys);
    expect(calls.length).toBe(3);
    expect(new Set(keys).size).toBe(3);
  });
});
