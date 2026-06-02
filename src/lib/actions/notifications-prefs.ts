"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * B13c: persist per-channel notification toggles. Mirrors the
 * inbox/email/push/digest columns added in migration
 * b13c_notification_prefs.
 *
 * Defaults are all-on so a fresh account is fully wired; users only
 * pay attention here when they want to mute something.
 */
export async function updateNotificationPrefs(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Read each checkbox. HTML omits unchecked boxes from FormData, so we
  // treat presence-of-key as true and absence as false. The hidden
  // `_present` sentinel lets the form distinguish "no field submitted"
  // from "no checkboxes ticked".
  const has = (name: string) => formData.get(name) !== null;

  await db
    .update(profiles)
    .set({
      notifInapp: has("notif_inapp"),
      notifEmail: has("notif_email"),
      notifPush: has("notif_push"),
      notifDigest: has("notif_digest"),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  revalidatePath("/account/notifications");
}
