"use client";

import { useRef, useState, type ReactNode, type TouchEvent as RTouchEvent, type MouseEvent as RMouseEvent } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { deleteTrip } from "@/lib/actions/trip-settings";
import { createTripInvite } from "@/lib/actions/invite";
import { useT } from "@/components/i18n/locale-provider";
import { toast } from "sonner";
import { ArrowSquareOut as OpenIcon, ShareNetwork, GearSix, Trash } from "@phosphor-icons/react/dist/ssr";

/**
 * D1 (chosen 2026-08-28): long-press any dashboard trip card → an action
 * sheet — Open · Share invite · Trip settings · Delete. A 500ms hold with a
 * still finger opens it; a scroll or a normal tap never does. Desktop gets
 * the same sheet on right-click. Delete confirms inside the sheet and is
 * owner-only.
 */
export function TripCardActions({
  tripId, tripName, isOwner, children,
}: {
  tripId: string; tripName: string; isOwner: boolean; children: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  function arm(x: number, y: number) {
    start.current = { x, y };
    timer.current = setTimeout(() => {
      timer.current = null;
      suppressClickUntil.current = performance.now() + 600;
      try { navigator.vibrate?.(10); } catch { /* ignore */ }
      setOpen(true);
    }, 500);
  }
  function disarm() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    start.current = null;
  }
  function onTouchStart(e: RTouchEvent) {
    const p = e.touches[0];
    if (p) arm(p.clientX, p.clientY);
  }
  function onTouchMove(e: RTouchEvent) {
    const p = e.touches[0];
    if (!p || !start.current) return;
    if (Math.hypot(p.clientX - start.current.x, p.clientY - start.current.y) > 10) disarm();
  }
  function onClickCapture(e: RMouseEvent) {
    // Only the ghost click right after a long-press is swallowed. NOTE: the
    // sheet portals to <body> but its clicks still bubble through the REACT
    // tree into this capture — never block while the sheet is open.
    if (performance.now() < suppressClickUntil.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function onContextMenu(e: RMouseEvent) {
    e.preventDefault();
    suppressClickUntil.current = performance.now() + 600;
    setOpen(true);
  }

  function close() { setOpen(false); setConfirming(false); }

  async function share() {
    close();
    try {
      const url = await createTripInvite(tripId);
      if (navigator.share) await navigator.share({ title: tripName, url });
      else { await navigator.clipboard?.writeText(url); toast.success(t("common.copied")); }
    } catch { /* user cancelled the share sheet — not an error */ }
  }

  async function doDelete() {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("tripId", tripId);
      await deleteTrip(fd);
      close();
      toast.success(t("trip.settingsDeleted"));
      router.refresh();
    } catch {
      toast.error(t("trip.settingsDeleteFailed"));
    } finally {
      setPending(false);
    }
  }

  const row = "w-full flex items-center gap-3 h-13 py-3.5 px-1 text-start text-[15px] font-semibold";

  return (
    <div
      className="contents"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={disarm}
      onTouchCancel={disarm}
      onClickCapture={onClickCapture}
      onContextMenu={onContextMenu}
    >
      {children}
      <BottomSheet open={open} onClose={close} title={tripName} size="sm">
        {confirming ? (
          <div className="pb-2">
            <p className="text-[15px] font-bold">{t("dashboard.deleteConfirmTitle")}</p>
            <p className="text-[13px] text-muted-foreground mt-1.5">{t("trip.settingsDangerWarning")}</p>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setConfirming(false)} className="flex-1 h-12 rounded-full border border-border bg-card text-[15px] font-bold">
                {t("common.cancel")}
              </button>
              <button type="button" disabled={pending} onClick={() => void doDelete()} className="flex-1 h-12 rounded-full text-[15px] font-bold text-white disabled:opacity-60" style={{ background: "#FF3B30" }}>
                {pending ? t("trip.settingsDeleting") : t("trip.settingsConfirmDelete")}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50 pb-1">
            <button type="button" className={row} onClick={() => { close(); router.push(`/trips/${tripId}`); }}>
              <OpenIcon size={18} className="text-muted-foreground" /> {t("dashboard.openTrip")}
            </button>
            <button type="button" className={row} onClick={() => void share()}>
              <ShareNetwork size={18} className="text-muted-foreground" /> {t("nav.shareTrip")}
            </button>
            <button type="button" className={row} onClick={() => { close(); router.push(`/trips/${tripId}/settings`); }}>
              <GearSix size={18} className="text-muted-foreground" /> {t("trip.settingsTitle")}
            </button>
            {isOwner && (
              <button type="button" className={row} style={{ color: "#FF3B30" }} onClick={() => setConfirming(true)}>
                <Trash size={18} /> {t("dashboard.deleteTrip")}
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
