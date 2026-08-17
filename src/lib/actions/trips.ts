"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { buildPackingSuggestions } from "@/lib/packing-suggestions";
import { trips, tripMembers, tripInvites, profiles, packingItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { inviteExpiry } from "@/lib/invite-ttl";
import { getLocale } from "@/lib/i18n";
import { ensureTripHeroImage } from "@/lib/actions/ensure-trip-hero";
import { sendEmail } from "@/lib/email/send";
import { getBaseUrl } from "@/lib/base-url";

function titleCase(s: string): string {
  if (!s) return s;
  // Leave Arabic / non-Latin strings alone — case rules don't apply.
  if (/[֐-ࣿऀ-෿一-鿿]/.test(s)) return s.replace(/\s+/g, " ");
  return s
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) =>
      w
        .split("-")
        .map((part) =>
          part.length === 0 ? part : part[0].toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join("-"),
    )
    .join(" ");
}

export async function createTrip(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  // B21: normalize user input so dashboard/hero pills don't read as
  // "malaysia" or "Taiz, yemen". Title-case each word; collapse runs of
  // whitespace; preserve internal punctuation (commas, hyphens). Skips
  // Arabic-script strings since case doesn't apply.
  const rawName = (formData.get("name") as string).trim();
  const rawDestination = (formData.get("destination") as string).trim();
  const name = titleCase(rawName);
  const destination = titleCase(rawDestination);
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const budgetTotal = formData.get("budgetTotal")
    ? parseFloat(formData.get("budgetTotal") as string)
    : null;
  // QA BUG-11: keep the per-person intent instead of flattening it.
  const budgetType = formData.get("budgetType") === "per_person" ? "per_person" : "flat";
  const currency = (formData.get("currency") as string) || "USD";
  // QA BUG-2: the wizard's "Who is coming?" emails — previously discarded.
  let inviteEmails: string[] = [];
  try {
    const raw = formData.get("inviteEmails");
    if (typeof raw === "string" && raw) {
      inviteEmails = (JSON.parse(raw) as string[])
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
        .slice(0, 20);
    }
  } catch {
    inviteEmails = [];
  }

  if (!name || !destination || !startDate || !endDate) {
    throw new Error("Missing required fields");
  }

  // Ensure profile exists
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    })
    .onConflictDoNothing();

  const [trip] = await db
    .insert(trips)
    .values({
      name,
      destination,
      startDate,
      endDate,
      budgetTotal,
      budgetType,
      currency,
      createdBy: user.id,
    })
    .returning();

  // Add creator as owner member
  await db.insert(tripMembers).values({
    tripId: trip.id,
    userId: user.id,
    displayName:
      user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
    role: "owner",
  });

  // B19: pre-warm the Unsplash hero photo so the brand-new trip already
  // has a real image before anyone opens it. Best-effort — failure leaves
  // the trip with the gradient placeholder, which still looks fine.
  ensureTripHeroImage({
    tripId: trip.id,
    destination,
  }).catch(() => {});

  // Create the trip's share invite token (authz-2: bounded to INVITE_TTL_DAYS,
  // no longer permanent — createTripInvite reissues after it lapses).
  const token = randomBytes(16).toString("hex");
  await db.insert(tripInvites).values({
    tripId: trip.id,
    token,
    createdBy: user.id,
    expiresAt: inviteExpiry(),
  });

  // QA BUG-2: persist each wizard invitee as an email-targeted invite row
  // (visible as "pending" on Crew) and send them the join link right away.
  // Best-effort — a failed email must never sink trip creation.
  if (inviteEmails.length > 0) {
    const inviteUrl = `${getBaseUrl()}/invite/${token}`;
    const hostName =
      user.user_metadata?.display_name || user.email?.split("@")[0] || "A friend";
    await db
      .insert(tripInvites)
      .values(
        inviteEmails.map((email) => ({
          tripId: trip.id,
          token: randomBytes(16).toString("hex"),
          invitedEmail: email,
          createdBy: user.id,
          expiresAt: inviteExpiry(),
        })),
      )
      .catch((e) => console.error("[createTrip/invites] insert failed:", e));
    for (const email of inviteEmails) {
      sendEmail({
        to: email,
        subject: `${hostName} invited you to "${name}" on Paxawa ✈️`,
        html: `<p>${hostName} is planning <strong>${name}</strong> (${destination}) and wants you on the crew.</p><p><a href="${inviteUrl}">Join the trip →</a></p><p style="color:#888;font-size:12px">If the button doesn't work, open: ${inviteUrl}</p>`,
        text: `${hostName} is planning "${name}" (${destination}) and wants you on the crew. Join: ${inviteUrl}`,
        kind: "trip_invite",
        idempotencyKey: `trip-invite:${trip.id}:${email}`,
      }).catch((e) => console.error("[createTrip/invites] email failed:", e));
    }
  }

  // B12: auto-seed packing list with destination-aware suggestions so
  // the user lands on a populated checklist instead of an empty state.
  // Pure local insert (no auth dance) — we already verified the user.
  // B15-d: seed labels follow the user's locale, so an Arabic tester
  // sees "جواز السفر" instead of "Passport" on the freshly created
  // packing list. Saved literally in the DB; later language flips
  // don't retranslate (matches user-generated content semantics).
  const tripLocale = await getLocale();
  const suggestions = buildPackingSuggestions(destination, tripLocale);
  if (suggestions.length > 0) {
    await db.insert(packingItems).values(
      suggestions.map((s) => ({
        tripId: trip.id,
        userId: null,
        label: s.label,
        category: s.category,
        createdBy: user.id,
      })),
    );
  }

  redirect(`/trips/${trip.id}`);
}

export async function getTripWithMembership(tripId: string, userId: string) {
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    with: {
      members: { with: { user: true } },
      invites: true,
    },
  });

  if (!trip) return null;

  const isMember = trip.members.some((m) => m.userId === userId);
  if (!isMember) return null;

  return trip;
}
