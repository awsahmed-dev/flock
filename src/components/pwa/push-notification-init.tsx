"use client";

import { useEffect } from "react";

// Initialise OneSignal once the app mounts.
// App ID is loaded from the env — safe to expose client-side.
export function PushNotificationInit() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || typeof window === "undefined") return;

    // Dynamically import to avoid SSR issues
    import("react-onesignal").then(({ default: OneSignal }) => {
      OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
        notifyButton: { enable: false, prenotify: false, showCredit: false, text: {} as any },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push" as const,
                autoPrompt: false,
                delay: { pageViews: 1, timeDelay: 20 },
                text: {
                  actionMessage:
                    "Get notified when your group votes, adds expenses, or plans something new.",
                  acceptButton: "Yes, notify me",
                  cancelButton: "Not now",
                },
              },
            ],
          },
        },
      }).catch(() => {
        // Silently fail — OneSignal is enhancement, not critical
      });
    });
  }, []);

  return null;
}
