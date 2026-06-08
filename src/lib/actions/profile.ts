"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * B19: persist display name + bio + avatar URL changes from the profile
 * settings page. Avatar uploads go directly from the client to Supabase
 * Storage (the bucket has owner-only write RLS); this action just
 * records the resulting public URL on the profiles row so it surfaces
 * everywhere the user appears (crew lists, chat, wallet attribution).
 */
export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const displayName = (formData.get("displayName") as string | null)?.trim();
  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const avatarUrl = (formData.get("avatarUrl") as string | null) ?? null;

  if (!displayName || displayName.length < 1) {
    throw new Error("Display name is required");
  }

  await db
    .update(profiles)
    .set({
      displayName,
      bio: bio || null,
      ...(avatarUrl ? { avatarUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  // Profile shows up across the app — revalidate the surfaces that
  // cache it. Trip pages re-fetch on each visit so they're not in here.
  revalidatePath("/account/profile");
  revalidatePath("/dashboard");
}
