"use client";

import { useEffect, useState } from "react";
import { BOUNDARY_STRINGS, readBoundaryLocale, type BoundaryLocale } from "@/lib/i18n/boundary-strings";
import * as Sentry from "@sentry/nextjs";
import { Warning as AlertTriangle, ArrowsClockwise as RefreshCw, House as Home } from "@phosphor-icons/react/dist/ssr";

/**
 * Top-level error boundary. Renders when an error escapes the root layout —
 * usually a Server-Component crash before a page has a chance to render its
 * own error.tsx. Must declare its own <html>/<body>.
 *
 * Captures to Sentry (DSN-gated; silently no-ops without a DSN) and shows a
 * friendly recovery card with a Try-again button (Next 16's unstable_retry).
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // No LocaleProvider exists here (this replaces the root layout), so the
  // locale comes from the cookie after mount. First paint is English; the
  // useEffect flips it — acceptable for a crash screen.
  const [locale, setLocale] = useState<BoundaryLocale>("en");
  useEffect(() => {
    Sentry.captureException(error);
    setLocale(readBoundaryLocale());
  }, [error]);
  const s = BOUNDARY_STRINGS[locale];

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background:
            "radial-gradient(circle at 30% 20%, #1e1b4b 0%, #0b0a1a 60%)",
          color: "#f8fafc",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: 20,
            padding: "2rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <AlertTriangle color="#f87171" size={24} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {s.title}
          </h1>
          <p
            style={{
              margin: "0.5rem 0 1.5rem",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              color: "rgba(248, 250, 252, 0.7)",
            }}
          >
            {s.body}
          </p>

          {error.digest && (
            <p
              style={{
                margin: "0 0 1.5rem",
                padding: "0.5rem 0.75rem",
                fontSize: "0.7rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "rgba(248, 250, 252, 0.5)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 8,
                wordBreak: "break-all",
              }}
            >
              {s.ref} {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                flex: 1,
                minWidth: 140,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "0.7rem 1rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              {s.tryAgain}
            </button>
            <a
              href="/dashboard"
              style={{
                flex: 1,
                minWidth: 140,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "0.7rem 1rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              <Home size={14} />
              {s.dashboard}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
