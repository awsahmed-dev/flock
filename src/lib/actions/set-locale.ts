"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * B15: persist the chosen locale to a cookie + revalidate so the next
 * server render hits the new dictionary.
 *
 * The cookie is httpOnly=false on purpose — a client component might
 * eventually want to read it without a round trip. It's 1 year + path
 * "/" so the choice survives across sessions and subpaths.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // B15-e: also persist on the profile so server-only flows (digest
  // cron, push payloads, eventual Arabic email templates) can target
  // the user's chosen language without seeing a browser cookie. Soft-
  // fails — losing this write isn't blocking the UI flip.
  try {
    const user = await getCurrentUser();
    if (user?.id) {
      await db
        .update(profiles)
        .set({ locale })
        .where(eq(profiles.id, user.id));
    }
  } catch (err) {
    console.error("[set-locale] profile write failed:", err);
  }

  // Revalidate the full layout so the next render rebuilds with the
  // new dictionary + new <html dir>.
  revalidatePath("/", "layout");
}
