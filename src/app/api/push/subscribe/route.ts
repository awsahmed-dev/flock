import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Stores a web-push subscription for the current user. The browser's
 * PushManager.subscribe() returns a PushSubscription that we serialize into
 * { endpoint, keys: { p256dh, auth } } — exactly what we persist here.
 *
 * Endpoint is UNIQUE in the table, so re-subscribing the same device is a
 * no-op upsert.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const endpoint = body?.endpoint as string | undefined;
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? null;

  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint, p256dh, auth, userAgent })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh,
        auth,
        userAgent,
        lastSeenAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  // authz-2: any signed-in user could unsubscribe ANY device by endpoint
  // (endpoints are guessable-ish and leak in logs). Only your own rows.
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));

  return NextResponse.json({ ok: true });
}
