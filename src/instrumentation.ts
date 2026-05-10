/**
 * Next.js instrumentation entry — runs once per server instance start.
 *
 * Sentry server + edge initialization is DSN-gated: if SENTRY_DSN is unset
 * (e.g. local dev, preview builds without secrets), the SDK initializes
 * with no transport and silently no-ops. Set SENTRY_DSN in Vercel project
 * env vars to start capturing errors.
 *
 * Per Next.js 16 conventions, this file also exports `onRequestError` so
 * that errors from RSC, route handlers, and Middleware are forwarded to
 * Sentry without us having to instrument every route by hand.
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      enabled: process.env.NODE_ENV === "production",
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      enabled: process.env.NODE_ENV === "production",
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
