"use client";

import { useState } from "react";
import { AccountSheet } from "./account-sheet";
import { useProfile } from "./use-profile";

const ACCENT = "var(--clr-brand)";

/**
 * §3-F: one shared header avatar — the single source of truth for "my avatar"
 * across every trip header (NOW cockpit, Discover, etc.). Renders the current
 * user's photo (or an accent-tinted initial) and opens the Account bottom sheet
 * on tap. Self-contained: it owns its own sheet so any header can drop it in
 * with zero extra wiring.
 */
export function AccountAvatarButton({
  size = 36,
  borderColor = ACCENT,
  tripSettingsHref = null,
}: {
  size?: number;
  borderColor?: string;
  /** Trip context: shows a "Trip settings" row in the sheet (owner only —
   *  the caller decides). Replaces the retired desktop dropdown's entry. */
  tripSettingsHref?: string | null;
}) {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const initial =
    (profile?.displayName || profile?.email || "?")[0]?.toUpperCase() ?? "?";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Account"
        className="rounded-full overflow-hidden shrink-0 flex items-center justify-center active:scale-95 transition-transform"
        style={{ width: size, height: size, border: `2px solid ${borderColor}`, pointerEvents: "auto" }}
      >
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center font-bold text-white"
            style={{ background: ACCENT, fontSize: size * 0.4 }}
          >
            {initial}
          </span>
        )}
      </button>

      <AccountSheet
        open={open}
        onClose={() => setOpen(false)}
        displayName={profile?.displayName ?? ""}
        avatarUrl={profile?.avatarUrl ?? null}
        email={profile?.email ?? null}
        tripSettingsHref={tripSettingsHref}
      />
    </>
  );
}
