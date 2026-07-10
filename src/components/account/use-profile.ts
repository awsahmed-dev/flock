"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ProfileInfo {
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
}

// Module-level cache so multiple header avatars across a navigation don't each
// re-fetch the current user's profile.
let cache: ProfileInfo | null = null;

/**
 * §3-F: the current user's profile for the header avatar. Fetched once per
 * session (cached) via Supabase. Returns null until loaded.
 */
export function useProfile(): ProfileInfo | null {
  const [profile, setProfile] = useState<ProfileInfo | null>(cache);

  useEffect(() => {
    if (cache) {
      setProfile(cache);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const p: ProfileInfo = {
        displayName: data?.display_name ?? user.email?.split("@")[0] ?? "",
        avatarUrl: data?.avatar_url ?? null,
        email: user.email ?? null,
      };
      cache = p;
      if (!cancelled) setProfile(p);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}
