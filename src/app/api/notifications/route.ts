/**
 * B13b: in-app notification inbox API. The trip-shell bell polls this
 * lightly so a fresh event shows up without a full page reload.
 *
 * GET  → { rows: InboxRow[], unread: number }
 * POST → marks read. Body `{ ids: string[] }` (specific) or `{ all: true }`.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  markAllRead,
  markRead,
  recentForUser,
  unreadCount,
} from "@/lib/inbox";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [rows, unread] = await Promise.all([
    recentForUser(user.id, 20),
    unreadCount(user.id),
  ]);
  return NextResponse.json({ rows, unread });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    ids?: string[];
    all?: boolean;
  } | null;

  if (body?.all) {
    await markAllRead(user.id);
  } else if (Array.isArray(body?.ids) && body.ids.length > 0) {
    await markRead(user.id, body.ids);
  }
  return NextResponse.json({ ok: true });
}
