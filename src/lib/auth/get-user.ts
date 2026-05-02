import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Dev-mode fake user — used when NODE_ENV=development and no real session exists.
 * This UUID intentionally has no matching DB rows, so queries return empty results.
 * Switch SKIP_AUTH to false (or deploy to production) to require real auth.
 */
export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "dev@flock.local",
  user_metadata: { name: "Dev User" },
  app_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as const;

/**
 * Get the currently authenticated user.
 *
 * Resolution order:
 *   1. If a `request` is passed and has `Authorization: Bearer <jwt>`,
 *      validate the JWT against Supabase Auth. This is how the **mobile app**
 *      authenticates against this same Next.js API — it sends its Supabase
 *      access token as a Bearer header (no shared cookies between domains).
 *   2. Cookie-based session (set by the website on sign-in).
 *   3. In development, fall back to the DEV_USER stub.
 */
export async function getCurrentUser(request?: NextRequest | Request) {
  // 1. Bearer token (mobile clients, native apps, server-to-server)
  if (request) {
    const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice("bearer ".length).trim();
      if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseAnonKey) {
          const sb = createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
          const { data: { user } } = await sb.auth.getUser(token);
          if (user) return user;
        }
      }
    }
  }

  // 2. Cookie-based session (website)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  // 3. Dev fallback
  if (process.env.NODE_ENV === "development") {
    return DEV_USER as unknown as typeof user;
  }

  return null;
}
