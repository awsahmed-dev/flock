"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Per-route error boundary. Used when an error happens below the root
 * layout — keeps the app shell intact and just replaces the page content
 * with a recovery card. global-error.tsx is the fallback if even the
 * root layout crashes.
 *
 * Captures to Sentry (DSN-gated). Renders Tailwind UI matching the rest
 * of the app (vs the bare-bones inline styles in global-error.tsx, which
 * can't rely on Tailwind being loaded).
 */
export default function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60dvh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <h1 className="text-lg font-bold mb-1">Something went off-course</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The page hit an error while loading. The crew's been notified — try
          again, or head back to where you were.
        </p>

        {error.digest && (
          <p className="font-mono text-[10px] text-muted-foreground/70 bg-muted/40 rounded px-2 py-1 mb-4 break-all">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
          <a
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-border bg-muted/40 text-foreground font-bold text-sm px-4 py-2.5 hover:bg-muted/60 transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
