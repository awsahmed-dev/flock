"use client";

import posthog from "posthog-js";

/**
 * Funnel-tracking helpers. Every call is a no-op when consent hasn't been
 * granted (posthog isn't loaded), so callers can fire freely without
 * guarding.
 *
 * Keep this list small. Each event is a step in the activation funnel —
 * resist the urge to track every click. Funnel narrowness = signal clarity.
 */

function safeCapture(event: string, props?: Record<string, unknown>) {
  try {
    posthog.capture(event, props);
  } catch {
    // ignore — pre-consent or pre-init
  }
}

export const track = {
  signup: (method: "google" | "email") =>
    safeCapture("signup", { method }),

  tripCreated: (tripId: string, destination: string) =>
    safeCapture("trip_created", { trip_id: tripId, destination }),

  inviteSent: (tripId: string) =>
    safeCapture("invite_sent", { trip_id: tripId }),

  voteOpened: (tripId: string) =>
    safeCapture("vote_opened", { trip_id: tripId }),

  expenseLogged: (tripId: string, currency: string) =>
    safeCapture("expense_logged", { trip_id: tripId, currency }),

  notificationsEnabled: () => safeCapture("notifications_enabled"),

  aiPlannerUsed: (tripId: string) =>
    safeCapture("ai_planner_used", { trip_id: tripId }),
};
