import { createClient } from "@/lib/supabase/server";

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

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return user;

  // In development, return the fake user instead of redirecting
  if (process.env.NODE_ENV === "development") {
    return DEV_USER as unknown as typeof user;
  }

  return null;
}
