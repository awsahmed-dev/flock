"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { sendEmail } from "@/lib/email/send";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";

/**
 * In-app feedback. Sent to hello@paxawa.com via Resend with everything we
 * need to reproduce the user's context: rating, body, the URL they were on,
 * their email + name (so we can reply), and the user-agent.
 *
 * No DB row. Email is the source of truth — keeps the loop in the founder's
 * inbox, where it'll actually get read. Once volume justifies it we can
 * persist to a `feedback` table; not worth it pre-launch.
 */

interface Result {
  ok: boolean;
  message: string;
}

export async function sendFeedback(formData: FormData): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Sign in first." };
  }

  const rating = Number(formData.get("rating") ?? 0);
  const body = ((formData.get("body") as string | null) ?? "").trim();
  const path = (formData.get("path") as string | null) ?? "(unknown)";
  const wantsReply = formData.get("wantsReply") === "true";

  if (!body && (!rating || rating < 1)) {
    return { ok: false, message: "Tell us what's on your mind first." };
  }
  if (body.length > 4000) {
    return { ok: false, message: "Keep it under 4000 characters." };
  }

  const h = await headers();
  const userAgent = h.get("user-agent")?.slice(0, 240) ?? "(unknown)";
  const userEmail = (user as any).email ?? "(no email)";
  const displayName =
    (user as any).user_metadata?.display_name ||
    userEmail.split("@")[0] ||
    "Traveler";

  const subject = `📝 Feedback from ${displayName}${rating ? ` · ${rating}/5` : ""}`;

  const ratingLabels = ["", "Bad", "Meh", "OK", "Good", "Great"];
  const ratingDisplay = rating
    ? `${"⭐".repeat(rating)} (${ratingLabels[rating]})`
    : "—";

  const text = [
    `Feedback from ${displayName} <${userEmail}>`,
    `Rating: ${ratingDisplay}`,
    `Page: ${path}`,
    `Wants reply: ${wantsReply ? "yes" : "no"}`,
    `User-Agent: ${userAgent}`,
    "",
    "—",
    "",
    body || "(no body)",
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; padding: 16px;">
      <p style="font-size: 14px; color: #475569; margin: 0 0 12px;">
        <strong>${displayName}</strong> &lt;${userEmail}&gt;
      </p>
      <p style="font-size: 14px; color: #475569; margin: 0 0 4px;">
        Rating: <strong>${ratingDisplay}</strong>
      </p>
      <p style="font-size: 14px; color: #475569; margin: 0 0 4px;">
        Page: <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">${path}</code>
      </p>
      <p style="font-size: 14px; color: #475569; margin: 0 0 4px;">
        Wants reply: <strong>${wantsReply ? "yes" : "no"}</strong>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 20px;">
        ${escapeHtml(userAgent)}
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0;" />
      <pre style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 15px; line-height: 1.5; color: #0f172a; white-space: pre-wrap; word-wrap: break-word; margin: 16px 0 0;">
${escapeHtml(body || "(no body)")}
      </pre>
    </div>
  `;

  const result = await sendEmail({
    to: process.env.FEEDBACK_TO_EMAIL ?? "hello@paxawa.com",
    subject,
    html,
    text,
    kind: "welcome", // reused tag — feedback is rare enough not to warrant its own enum value yet
    idempotencyKey: `feedback:${user.id}:${Date.now()}`,
  });

  if (!result.ok) {
    Sentry.captureMessage("Feedback email send failed", {
      level: "error",
      extra: { error: result.error },
    });
    return { ok: false, message: "Couldn't send — try again." };
  }
  return { ok: true, message: "Thanks — got it." };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
