"use server";

import { db } from "@/lib/db";
import { tripInvites, tripMembers, profiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function joinTripAsGuest(formData: FormData) {
  const token = formData.get("token") as string;
  const tripId = formData.get("tripId") as string;
  const displayName = (formData.get("displayName") as string).trim();
  const email = (formData.get("email") as string | null)?.trim() || null;

  if (!displayName) throw new Error("Name is required");

  const invite = await db.query.tripInvites.findFirst({
    where: eq(tripInvites.token, token),
  });

  if (!invite || invite.tripId !== tripId) throw new Error("Invalid invite");
  if (invite.expiresAt && new Date() > invite.expiresAt) throw new Error("Invite expired");

  if (email) {
    // Create a magic-link session for the guest so they can return later
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/trips/${tripId}`,
        data: { display_name: displayName },
      },
    });
    if (error) throw new Error(error.message);

    // We'll add them to the trip after they click the email link (handled in callback)
    // For now, redirect to a "check email" screen
    redirect(`/invite/${token}/check-email`);
  } else {
    // Guest without email — create an anonymous session via Supabase
    const supabase = await createClient();
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError || !anonData.user) throw new Error("Failed to create guest session");

    const userId = anonData.user.id;

    // Ensure profile
    await db
      .insert(profiles)
      .values({ id: userId, displayName })
      .onConflictDoNothing();

    // Check not already a member
    const existing = await db.query.tripMembers.findFirst({
      where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)),
    });

    if (!existing) {
      await db.insert(tripMembers).values({
        tripId,
        userId,
        displayName,
        role: "member",
      });
    }

    redirect(`/trips/${tripId}`);
  }
}
