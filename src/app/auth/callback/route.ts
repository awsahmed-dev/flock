import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

/**
 * Ensure the just-authenticated user has a row in `profiles`. Multiple
 * downstream tables (trip_members, expenses.paid_by, chat_messages.user_id…)
 * have FKs to profiles.id, so if a Google-OAuth signup hits any of them
 * before this row exists, Postgres throws and the page 500s.
 *
 * Hit during /invite/[token] auto-join — the first thing a brand-new
 * Google signup does is try to insert into trip_members.
 */
async function ensureProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName:
        (user.user_metadata as any)?.display_name ||
        user.email?.split("@")[0] ||
        "Traveler",
      email: user.email ?? null,
    })
    .onConflictDoNothing()
    .catch((e) => {
      // Soft-fail. The user is signed in regardless; downstream pages
      // will surface the FK error properly if they try to write before
      // the row exists.
      console.error("[auth/callback] ensureProfile failed:", e);
    });
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // PKCE flow (code exchange) — default for OAuth + newer magic links
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await ensureProfile(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // OTP token_hash flow — used when PKCE verifier cookie is missing
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      await ensureProfile(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fallback: redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
