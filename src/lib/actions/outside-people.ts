"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSplits, expenses, tripContacts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "./trips";
import type { Refused } from "./refusal";

/**
 * People outside the trip — names one member keeps for splitting with
 * people they met on the way. Every read and write is scoped to (trip,
 * owner): nobody else in the crew can list, see, or settle them, and they
 * never enter the crew's balances.
 *
 * Refusals the user should read come back as `{ ok: false, error }` (an
 * i18n key); a thrown message is redacted by React in production.
 */

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

async function assertMember(tripId: string, userId: string) {
  const trip = await getTripWithMembership(tripId, userId);
  if (!trip) throw new Error("Trip not found or access denied");
  return trip;
}

export interface OutsidePerson {
  id: string;
  name: string;
}

export interface OutsideSplit {
  id: string;
  contactId: string;
  expenseId: string;
  direction: "owes_me" | "i_owe";
  amount: number;
  currency: string;
  settled: boolean;
  expenseTitle: string;
  expenseDate: string;
  billTotal: number | null;
}

/** Everything the Money page needs about MY outside people in this trip. */
export async function listOutsidePeople(
  tripId: string,
): Promise<{ people: OutsidePerson[]; splits: OutsideSplit[] }> {
  const user = await me();
  await assertMember(tripId, user.id);

  const people = await db
    .select({ id: tripContacts.id, name: tripContacts.name })
    .from(tripContacts)
    .where(and(eq(tripContacts.tripId, tripId), eq(tripContacts.ownerId, user.id)))
    .orderBy(tripContacts.createdAt);

  if (people.length === 0) return { people, splits: [] };

  const splits = await db
    .select({
      id: contactSplits.id,
      contactId: contactSplits.contactId,
      expenseId: contactSplits.expenseId,
      direction: contactSplits.direction,
      amount: contactSplits.amount,
      settled: contactSplits.settled,
      currency: expenses.currency,
      expenseTitle: expenses.title,
      expenseDate: expenses.expenseDate,
      billTotal: expenses.billTotal,
    })
    .from(contactSplits)
    .innerJoin(expenses, eq(expenses.id, contactSplits.expenseId))
    .where(inArray(contactSplits.contactId, people.map((p) => p.id)));

  return { people, splits: splits.map((s) => ({ ...s, expenseDate: String(s.expenseDate) })) };
}

export async function addOutsidePerson(
  tripId: string,
  name: string,
): Promise<{ ok: true; person: OutsidePerson } | Refused> {
  const user = await me();
  await assertMember(tripId, user.id);
  const clean = name.replace(/\s+/g, " ").trim();
  if (!clean) return { ok: false, error: "outside.errNameMissing" };
  if (clean.length > 60) return { ok: false, error: "outside.errNameLong" };

  // Same name twice in one trip is almost always a double tap, not a second
  // Khalid — hand back the one that exists.
  const existing = await db
    .select({ id: tripContacts.id, name: tripContacts.name })
    .from(tripContacts)
    .where(and(eq(tripContacts.tripId, tripId), eq(tripContacts.ownerId, user.id)));
  const same = existing.find((p) => p.name.toLocaleLowerCase() === clean.toLocaleLowerCase());
  if (same) return { ok: true, person: same };

  const [person] = await db
    .insert(tripContacts)
    .values({ tripId, ownerId: user.id, name: clean })
    .returning({ id: tripContacts.id, name: tripContacts.name });
  return { ok: true, person };
}

/** Mark everything open with this person as paid back, both directions. */
export async function settleOutsidePerson(
  tripId: string,
  contactId: string,
): Promise<{ ok: true } | Refused> {
  const user = await me();
  await assertMember(tripId, user.id);
  const [owned] = await db
    .select({ id: tripContacts.id })
    .from(tripContacts)
    .where(and(eq(tripContacts.id, contactId), eq(tripContacts.tripId, tripId), eq(tripContacts.ownerId, user.id)));
  if (!owned) return { ok: false, error: "outside.errNotFound" };

  await db
    .update(contactSplits)
    .set({ settled: true, settledAt: new Date() })
    .where(and(eq(contactSplits.contactId, contactId), eq(contactSplits.settled, false)));

  revalidatePath(`/trips/${tripId}/money`);
  return { ok: true };
}

/**
 * Forget a person. Refused while anything is still open with them — deleting
 * the person would silently delete what they owe you.
 */
export async function removeOutsidePerson(
  tripId: string,
  contactId: string,
): Promise<{ ok: true } | Refused> {
  const user = await me();
  await assertMember(tripId, user.id);
  const [owned] = await db
    .select({ id: tripContacts.id })
    .from(tripContacts)
    .where(and(eq(tripContacts.id, contactId), eq(tripContacts.tripId, tripId), eq(tripContacts.ownerId, user.id)));
  if (!owned) return { ok: false, error: "outside.errNotFound" };

  const open = await db
    .select({ id: contactSplits.id })
    .from(contactSplits)
    .where(and(eq(contactSplits.contactId, contactId), eq(contactSplits.settled, false)))
    .limit(1);
  if (open.length > 0) return { ok: false, error: "outside.errSettleFirst" };

  await db.delete(tripContacts).where(eq(tripContacts.id, contactId));
  revalidatePath(`/trips/${tripId}/money`);
  return { ok: true };
}
