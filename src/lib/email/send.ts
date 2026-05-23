import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";

/**
 * Email sender. DSN-gated: if RESEND_API_KEY isn't set the helper returns
 * `{ skipped: true }` and the caller carries on — never throws into a
 * server action over a missing key.
 *
 * Every email is also tagged with a `kind` for the Resend dashboard, and
 * `idempotencyKey` (when supplied) so retried server actions don't double-
 * send. The Resend SDK natively supports the latter as `headers["Idempotency-Key"]`.
 */

const resendClient = (() => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
})();

const FROM =
  process.env.RESEND_FROM_EMAIL ??
  "Paxawa <hello@paxawa.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? undefined;

export type EmailKind =
  | "welcome"
  | "invite_accepted"
  | "vote_opened"
  | "vote_resolved"
  | "expense_logged"
  | "trip_digest";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  /** Pre-rendered HTML body (we use @react-email/render). */
  html: string;
  /** Plain-text fallback. Gmail / Yahoo look at this for spam scoring. */
  text: string;
  kind: EmailKind;
  /** Resend idempotency key — same key within 24h = same delivery. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  if (!resendClient) {
    return { ok: true, skipped: true };
  }

  try {
    const { data, error } = await resendClient.emails.send(
      {
        from: FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: REPLY_TO,
        tags: [{ name: "kind", value: params.kind }],
      },
      params.idempotencyKey
        ? { idempotencyKey: params.idempotencyKey }
        : undefined,
    );

    if (error) {
      console.error("[email] resend failed:", error);
      Sentry.captureMessage("Resend send failed", {
        level: "error",
        tags: { kind: params.kind },
        extra: { error },
      });
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error("[email] unexpected error:", err);
    Sentry.captureException(err);
    return { ok: false, error: err?.message ?? String(err) };
  }
}
