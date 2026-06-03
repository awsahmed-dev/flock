"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

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
  // Revalidate the full layout so the next render rebuilds with the
  // new dictionary + new <html dir>.
  revalidatePath("/", "layout");
}
