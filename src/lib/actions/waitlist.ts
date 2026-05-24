"use server";

import { db } from "@/lib/db";
import { waitlistSignups } from "@/lib/db/schema";
import { headers } from "next/headers";

/**
 * Adds an email to the waitlist. Idempotent — repeat submits return ok=true
 * without growing the table. Validates the email locally; we don't send a
 * verification mail (zero-friction capture).
 *
 * Returns `{ ok, message }` so the form can show a tasteful success/error
 * line without throwing into Sentry on the user-typed-a-typo path.
 */
export async function joinWaitlist(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const source = (formData.get("source") as string | null) ?? "landing";

  // Cheap local validation — matches the same shape RFC-5322 would accept
  // for 99% of real addresses without pulling in a library.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "That doesn't look like a valid email." };
  }
  if (email.length > 254) {
    return { ok: false, message: "Email too long." };
  }

  const h = await headers();
  const userAgent = h.get("user-agent")?.slice(0, 240) ?? null;

  try {
    await db
      .insert(waitlistSignups)
      .values({ email, source: source.slice(0, 60), userAgent })
      .onConflictDoNothing();
    return { ok: true, message: "You're in — we'll keep you posted." };
  } catch (err) {
    console.error("[waitlist] insert failed:", err);
    return { ok: false, message: "Something broke. Try again in a minute." };
  }
}
