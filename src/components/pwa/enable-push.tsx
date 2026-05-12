"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Single button that walks the user through web-push enrollment:
 *
 *   1. Confirm Notification API + service worker exist
 *   2. Ask for Notification permission
 *   3. PushManager.subscribe({ applicationServerKey: VAPID })
 *   4. POST the subscription to /api/push/subscribe
 *
 * Renders nothing at all if VAPID isn't configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY
 * unset) — same DSN-gating story as the server-side helpers. State persists
 * naturally: PushManager remembers existing subscriptions across reloads.
 */

// Convert the URL-safe base64 public key to the Uint8Array PushManager wants.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const padded = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface Props {
  /** Optional className for layout when embedded in a menu item, etc. */
  className?: string;
}

export function EnablePushButton({ className }: Props) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!vapidKey) return;
    setSupported(true);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, [vapidKey]);

  if (!supported) return null;

  async function enable() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error(
          perm === "denied"
            ? "Notifications blocked in browser settings"
            : "Permission needed",
        );
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      // Cast the Uint8Array buffer to ArrayBuffer for TS — the runtime
      // representation is identical, only the type lib distinguishes them.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!).buffer as ArrayBuffer,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Server rejected subscription");
      setSubscribed(true);
      toast.success("Notifications enabled");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't enable");
    }
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications turned off");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't disable");
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => (subscribed ? disable() : enable()))
      }
      className={
        className ??
        "w-full inline-flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
      }
    >
      {subscribed ? (
        <>
          <BellOff className="w-4 h-4" />
          Turn off notifications
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Enable notifications
        </>
      )}
    </button>
  );
}
