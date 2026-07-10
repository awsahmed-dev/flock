import { createClient } from "@supabase/supabase-js";

/**
 * QA BUG-1 — server-only admin client (service role). Used to create guest /
 * lightweight accounts WITHOUT sending an email (email_confirm: true skips
 * the confirmation send entirely, so the project's email rate limit can't
 * break the invite→join loop). Never import from client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
