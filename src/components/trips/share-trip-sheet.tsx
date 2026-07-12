"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ShareNetwork as Share2, CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { createTripInvite } from "@/lib/actions/invite";
import { useT } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/primitives/buttons/ripple";

export interface CrewMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Share/invite sheet (Bug 5). Lazily mints — or reuses — a trip invite link
 * (a real /invite/[token] join landing) the first time it opens, then offers
 * copy + the native share sheet (navigator.share, falling back to copy).
 */
export function ShareTripSheet({
  open,
  onClose,
  tripId,
  tripName,
  crew = [],
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  crew?: CrewMember[];
}) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || url) return;
    let cancelled = false;
    createTripInvite(tripId)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [open, tripId, url]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  async function nativeShare() {
    if (!url) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: tripName, text: tripName, url });
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      copy();
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("share.inviteTo", { name: tripName })} subtitle={t("share.subtitle")} size="sm">
      {error ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("share.error")}</p>
      ) : !url ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-muted/40 p-1.5 flex items-center gap-2">
            <input
              readOnly
              value={url}
              dir="ltr"
              aria-label={t("share.linkLabel")}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-transparent px-2 text-sm outline-none truncate"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-card ring-1 ring-border px-3 h-9 text-xs font-bold active:scale-95 transition-transform"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? t("share.copied") : t("share.copy")}
            </button>
          </div>
          {/* Brief C: tactile ripple on the primary CTA. */}
          <RippleButton
            type="button"
            onClick={nativeShare}
            tapScale={0.95} hoverScale={1.02}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-primary-foreground font-bold"
          >
            <Share2 className="w-5 h-5" /> {t("share.share")}
            <RippleButtonRipples color="rgba(255,255,255,0.3)" />
          </RippleButton>

          {/* §7: current crew — avatars + first names + a count. */}
          {crew.length > 0 && (
            <div className="pt-3 mt-1 border-t border-border">
              <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-2.5">
                {t("share.peopleCount", { count: crew.length })}
              </p>
              <div className="flex flex-wrap gap-3">
                {crew.map((m) => (
                  <div key={m.userId} className="flex flex-col items-center gap-1 w-14">
                    <UserAvatar name={m.displayName} avatarUrl={m.avatarUrl} seed={m.userId} size="md" />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      {m.displayName.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
