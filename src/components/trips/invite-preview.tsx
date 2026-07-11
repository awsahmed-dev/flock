"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  acceptInvite,
  declineInvite,
} from "@/lib/actions/invite-accept";
import { ArrowRight, X, Loader2 } from "lucide-react";

/**
 * Accept / Decline button row for the invite preview page (signed-in path).
 * Both call dedicated server actions so the redirect semantics are clean.
 */
export function InvitePreviewActions({
  token,
}: {
  token: string;
}) {
  const [isPending, startTransition] = useTransition();

  function accept() {
    const fd = new FormData();
    fd.set("token", token);
    startTransition(async () => {
      try {
        await acceptInvite(fd);
      } catch (e: any) {
        const msg = e?.message ?? String(e ?? "");
        // Next.js' redirect() throws an internal NEXT_REDIRECT — never
        // surface that as an error toast.
        if (msg.includes("NEXT_REDIRECT")) return;
        toast.error(msg || "Couldn't join the trip");
      }
    });
  }

  function decline() {
    startTransition(async () => {
      try {
        await declineInvite();
      } catch (e: any) {
        const msg = e?.message ?? String(e ?? "");
        if (msg.includes("NEXT_REDIRECT")) return;
        toast.error(msg || "Couldn't decline");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={decline}
        disabled={isPending}
        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 text-foreground font-bold text-sm px-4 py-3 hover:bg-muted/60 transition-colors disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
        No thanks
      </button>
      <button
        type="button"
        onClick={accept}
        disabled={isPending}
        className="flex-[1.5] inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm px-4 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Join the trip
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </>
        )}
      </button>
    </div>
  );
}
