import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications, profiles } from "@/lib/db/schema";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email/send";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * B13c: daily digest cron. Runs once a day (vercel.json cron entry).
 *
 * For every user with `notif_digest = true` and at least one unread
 * inbox row from the last 24h, send a single email summarizing those
 * rows. Skips users who turned off the digest, or whose unread set is
 * empty. Soft-fails per row; one bad recipient never blocks the rest.
 *
 * Auth: same pattern as the pre-trip-nudge cron — Vercel sets
 * `Authorization: Bearer $CRON_SECRET`. Manual triggers may pass
 * `?secret=` for parity.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  if (secret && auth !== `Bearer ${secret}` && querySecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull every unread notification from the last 24h alongside the
  // recipient's profile (so we can check digest opt-in + grab the
  // address in one round trip).
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      userId: notifications.userId,
      email: profiles.email,
      displayName: profiles.displayName,
      notifDigest: profiles.notifDigest,
      title: notifications.title,
      body: notifications.body,
      tripId: notifications.tripId,
      kind: notifications.type,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(profiles, eq(notifications.userId, profiles.id))
    .where(
      and(
        isNull(notifications.readAt),
        gte(notifications.createdAt, cutoff),
      ),
    );

  // Bucket by user → only opt-ins with at least one row.
  type Bucket = {
    email: string;
    displayName: string;
    items: { title: string | null; body: string | null; kind: string; tripId: string }[];
  };
  const byUser = new Map<string, Bucket>();
  for (const r of rows) {
    if (!r.notifDigest || !r.email) continue;
    if (!byUser.has(r.userId)) {
      byUser.set(r.userId, {
        email: r.email,
        displayName: r.displayName,
        items: [],
      });
    }
    byUser.get(r.userId)!.items.push({
      title: r.title,
      body: r.body,
      kind: r.kind,
      tripId: r.tripId,
    });
  }

  let sent = 0;
  let skipped = 0;
  for (const [, bucket] of byUser) {
    if (bucket.items.length === 0) {
      skipped++;
      continue;
    }
    try {
      await sendEmail({
        to: bucket.email,
        subject: `${bucket.items.length} update${bucket.items.length === 1 ? "" : "s"} from your trips`,
        html: renderDigestHtml(bucket.displayName, bucket.items),
        text: renderDigestText(bucket.displayName, bucket.items),
        kind: "trip_digest",
      });
      sent++;
    } catch (err) {
      console.error("[notif-digest] send failed for", bucket.email, err);
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, totalUsers: byUser.size });
}

function renderDigestText(
  name: string,
  items: { title: string | null; body: string | null }[],
): string {
  const lines = items
    .map((i) => `• ${i.title ?? "Update"}${i.body ? ` — ${i.body}` : ""}`)
    .join("\n");
  return `Hi ${name},\n\nHere's what happened on your trips in the last day:\n\n${lines}\n\n— Paxawa`;
}

function renderDigestHtml(
  name: string,
  items: { title: string | null; body: string | null; tripId: string }[],
): string {
  const rows = items
    .map(
      (i) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111;">${escapeHtml(i.title ?? "Update")}</p>
            ${i.body ? `<p style="margin: 4px 0 0; font-size: 13px; color: #555;">${escapeHtml(i.body)}</p>` : ""}
          </td>
        </tr>`,
    )
    .join("");
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 540px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">Hi ${escapeHtml(name)},</h1>
      <p style="font-size: 14px; color: #555; margin: 0 0 16px;">
        Here's what happened on your trips in the last day.
      </p>
      <table style="width: 100%; border-collapse: collapse;">${rows}</table>
      <p style="font-size: 12px; color: #888; margin-top: 24px;">
        You can quiet this email any time in Notification settings.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
