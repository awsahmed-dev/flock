"use server";

import { db } from "@/lib/db";
import { tripInvites, tripMembers, profiles, trips } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { getBaseUrl } from "@/lib/base-url";
import { getCurrentUser } from "@/lib/auth/get-user";
import { sendEmail } from "@/lib/email/send";
import { renderInviteAccepted } from "@/lib/email/templates";
import { sendPush } from "@/lib/push/send";

/**
 * Get (or lazily create) a shareable invite link for a trip. Any member can
 * generate one — inviting crew is a member action, not owner-only. Reuses an
 * existing non-expired invite so a trip has one stable link. Returns the full
 * absolute URL to the /invite/[token] join landing (Screen G).
 */
export async function createTripInvite(tripId: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!member) throw new Error("Only trip members can create an invite link");

  const existing = await db.query.tripInvites.findFirst({
    where: eq(tripInvites.tripId, tripId),
  });
  const stillValid =
    existing && (!existing.expiresAt || new Date() <= existing.expiresAt);

  let token: string;
  if (stillValid) {
    token = existing!.token;
  } else {
    token = randomBytes(16).toString("hex");
    await db.insert(tripInvites).values({ tripId, token, createdBy: user.id });
  }
  return `${getBaseUrl()}/invite/${token}`;
}

/** QA BUG-1/13: recognize Supabase's email rate-limit in any wording. */
function isRateLimit(message: string | undefined | null): boolean {
  return /rate limit|too many/i.test(message ?? "");
}

/**
 * QA BUG-1 — guest join, rebuilt. The old flow depended on `signInWithOtp`
 * (email send → project rate limit → dead end) and `signInAnonymously`
 * (disabled on the project → dead end), and every failure THREW — which
 * production Next.js masks into the opaque "Server Components render" error.
 * Now: a lightweight account is created server-side via the admin API with
 * `email_confirm: true` (no email is ever sent), signed in with a generated
 * password, and added to the trip immediately. Failures RETURN `{ error }`
 * so the form can show an actionable message.
 */
export async function joinTripAsGuest(
  formData: FormData,
): Promise<{ error: string } | void> {
  const token = formData.get("token") as string;
  const tripId = formData.get("tripId") as string;
  const displayName = ((formData.get("displayName") as string) ?? "").trim();
  const email = (formData.get("email") as string | null)?.trim() || null;

  if (!displayName) return { error: "Name is required" };

  const invite = await db.query.tripInvites.findFirst({
    where: eq(tripInvites.token, token),
  });

  if (!invite || invite.tripId !== tripId) return { error: "This invite link is invalid." };
  if (invite.expiresAt && new Date() > invite.expiresAt)
    return { error: "This invite link has expired — ask for a fresh one." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const supabase = await createClient();

  // The account email: the guest's real one, or a synthetic guest address
  // for the name-only path (never mailed — confirmed at creation).
  const accountEmail =
    email ?? `guest-${randomBytes(8).toString("hex")}@guests.paxawa.com`;
  const password = randomBytes(24).toString("base64url");

  let userId: string | null = null;

  if (admin) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: accountEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, guest: email == null },
    });

    if (created?.user) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password,
      });
      if (signInError) return { error: "Couldn't start your session — please try again." };
      userId = created.user.id;
    } else if (email && /already|exists|registered/i.test(createError?.message ?? "")) {
      // Existing account for that email — we can't sign them in without their
      // password, so fall back to a magic link (and translate the rate limit).
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/trips/${tripId}`,
          data: { display_name: displayName },
          shouldCreateUser: false,
        },
      });
      if (otpError) {
        return {
          error: isRateLimit(otpError.message)
            ? "Too many sign-in attempts — try again in a few minutes, or use the Google button."
            : `That email already has an account — sign in to join. (${otpError.message})`,
        };
      }
      redirect(`/invite/${token}/check-email`);
    } else {
      return { error: "Couldn't create your guest account — please try again." };
    }
  } else {
    // No service key configured (e.g. local dev) — try anonymous auth as a
    // last resort and report honestly if the project has it disabled.
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !anonData.user) {
      return { error: "Guest join isn't available right now — use the Google button, or ask the host to add you." };
    }
    userId = anonData.user.id;
  }

  if (!userId) return { error: "Couldn't create your guest session — please try again." };

  // Ensure profile
  await db
    .insert(profiles)
    .values({ id: userId, displayName, email })
    .onConflictDoNothing();

  // Check not already a member
  const existing = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)),
  });

  if (!existing) {
    const [newMember] = await db
      .insert(tripMembers)
      .values({
        tripId,
        userId,
        displayName,
        role: "member",
      })
      .returning();

    // Notify the rest of the crew that a new member just joined.
    notifyInviteAccepted({
      tripId,
      memberId: newMember.id,
      joinerName: displayName,
      joinerUserId: userId,
    }).catch((e) => console.error("[invite/notify] failed:", e));
  }

  redirect(`/trips/${tripId}`);
}

async function notifyInviteAccepted(args: {
  tripId: string;
  memberId: string;
  joinerName: string;
  joinerUserId: string;
}): Promise<void> {
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, args.tripId),
  });
  if (!trip) return;
  const members = await db
    .select({ userId: tripMembers.userId, displayName: tripMembers.displayName })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, args.tripId));
  const recipientUserIds: string[] = [];
  for (const m of members) {
    if (m.userId === args.joinerUserId) continue;
    recipientUserIds.push(m.userId);
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, m.userId),
    });
    if (!profile?.email) continue;
    const rendered = await renderInviteAccepted({
      recipientName: m.displayName || profile.displayName || "there",
      joinerName: args.joinerName,
      tripName: trip.name,
      destination: trip.destination,
      tripId: args.tripId,
      memberId: args.memberId,
    });
    await sendEmail({ to: profile.email, ...rendered, kind: "invite_accepted" });
  }

  await sendPush({
    toUserIds: recipientUserIds,
    payload: {
      title: `🎉 ${args.joinerName} joined ${trip.name}`,
      body: `The crew for ${trip.destination} is coming together.`,
      url: `/trips/${args.tripId}`,
      tag: `invite:${args.tripId}`,
    },
  });
}
