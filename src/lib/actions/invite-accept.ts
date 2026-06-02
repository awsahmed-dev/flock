"use server";

import { db } from "@/lib/db";
import { tripInvites, tripMembers, profiles, trips } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renderInviteAccepted } from "@/lib/email/templates";
import { sendPush } from "@/lib/push/send";
import { recordEvent } from "@/lib/inbox";

/**
 * Explicit accept for an invite link. Used by the /invite/[token] preview
 * page after the visitor reviews the trip details. Mirrors the auto-join
 * fallback inside `/invite/[token]` for the existing signed-in path but
 * is intentionally a separate action so the preview UX can opt the user
 * in or out without changing the route.
 */
export async function acceptInvite(formData: FormData) {
  const token = formData.get("token") as string;
  if (!token) throw new Error("Missing invite token");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invite = await db.query.tripInvites.findFirst({
    where: eq(tripInvites.token, token),
  });
  if (!invite) throw new Error("Invalid invite");
  if (invite.expiresAt && new Date() > invite.expiresAt) {
    throw new Error("Invite expired");
  }

  // Idempotent — if they're already a member just route them in.
  const existing = await db.query.tripMembers.findFirst({
    where: and(
      eq(tripMembers.tripId, invite.tripId),
      eq(tripMembers.userId, user.id),
    ),
  });
  if (existing) {
    redirect(`/trips/${invite.tripId}`);
  }

  // Ensure profiles row (Google OAuth signups skip it; FK would 500).
  const fallbackName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Traveler";
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName: fallbackName,
      email: user.email ?? null,
    })
    .onConflictDoNothing();

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });
  const displayName = profile?.displayName || fallbackName;

  const [newMember] = await db
    .insert(tripMembers)
    .values({
      tripId: invite.tripId,
      userId: user.id,
      displayName,
      role: "member",
    })
    .returning();

  // Notify the crew (mirrors joinTripAsGuest's notification path).
  notifyJoined(invite.tripId, newMember.id, displayName, user.id).catch((e) =>
    console.error("[invite/notify] failed:", e),
  );

  // B13c: in-app inbox row for everyone *else* on the trip.
  recordEvent({
    tripId: invite.tripId,
    kind: "member_joined",
    actorUserId: user.id,
    title: `${displayName} joined the trip`,
    body: "Tap to see the crew",
    payload: { memberId: newMember.id, joinerUserId: user.id },
    recipients: null,
  });

  redirect(`/trips/${invite.tripId}`);
}

/**
 * "Decline" — currently a soft action: routes the visitor away. We don't
 * have a "rejected_at" column or a notifier; if a B-side member rejects,
 * the owner finds out by them not showing up. Keep this lightweight for v1
 * and revisit if testers ask for a real reject signal.
 */
export async function declineInvite() {
  redirect("/");
}

async function notifyJoined(
  tripId: string,
  memberId: string,
  joinerName: string,
  joinerUserId: string,
): Promise<void> {
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
  });
  if (!trip) return;
  const members = await db
    .select({ userId: tripMembers.userId, displayName: tripMembers.displayName })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));

  const recipientIds: string[] = [];
  for (const m of members) {
    if (m.userId === joinerUserId) continue;
    recipientIds.push(m.userId);
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, m.userId),
    });
    if (!profile?.email) continue;
    const rendered = await renderInviteAccepted({
      recipientName: m.displayName || profile.displayName || "there",
      joinerName,
      tripName: trip.name,
      destination: trip.destination,
      tripId,
      memberId,
    });
    await sendEmail({ to: profile.email, ...rendered, kind: "invite_accepted" });
  }
  await sendPush({
    toUserIds: recipientIds,
    payload: {
      title: `🎉 ${joinerName} joined ${trip.name}`,
      body: `The crew for ${trip.destination} is coming together.`,
      url: `/trips/${tripId}`,
      tag: `invite:${tripId}`,
    },
  });
}
