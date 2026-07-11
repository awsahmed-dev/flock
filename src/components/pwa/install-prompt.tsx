"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed before
    if (sessionStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
      return;
    }

    // iOS detection
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as any).standalone;
    setIsIOS(ios);

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
    setInstallPrompt(null);
  }

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  }

  if (isInstalled || dismissed) return null;
  if (!installPrompt && !isIOS) return null;

  return (
    <>
      {/* Android install banner. B28: hidden on lg+ (desktop has a real
          tab/url + the PWA install lives in the browser's URL bar
          install icon there anyway) so it stops blocking the bottom-
          right of every page. */}
      {installPrompt && (
        <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 rounded-2xl border bg-background shadow-xl shadow-black/10 p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 lg:hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-lg">✈</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install Paxawa</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for the full app experience
            </p>
            <button
              onClick={handleInstall}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Download className="w-3 h-3" />
              Install app
            </button>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* iOS install guide — same lg:hidden treatment as Android. */}
      {isIOS && !showIOSGuide && (
        <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border bg-background shadow-xl shadow-black/10 p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 lg:hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-lg">✈</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Install Paxawa on iPhone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap <Share className="w-3 h-3 inline mx-0.5" /> then{" "}
              <strong>"Add to Home Screen"</strong>
            </p>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
