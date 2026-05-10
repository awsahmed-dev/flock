/**
 * Browser-side Sentry init — Next.js 16 picks this file up automatically.
 *
 * Same DSN-gating story as instrumentation.ts (server). NEXT_PUBLIC_SENTRY_DSN
 * must be set at build time to make it into the client bundle.
 */

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Capture 10% of normal sessions, 100% of sessions that hit an error,
    // so we can see what the user did right before things broke.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === "production",
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Required by @sentry/nextjs for client-side route-change tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
