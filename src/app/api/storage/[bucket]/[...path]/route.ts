import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { tripMembers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isPrivateBucket, pathGrant } from "@/lib/storage-url";

export const dynamic = "force-dynamic";

/**
 * authz-3: the only read path for the PRIVATE buckets.
 *
 *   GET /api/storage/<bucket>/<path...>
 *
 * 1. caller must be signed in;
 * 2. the object path must be in the caller's own uid folder OR under a trip
 *    the caller is a member of (see pathGrant — same rule as the RLS policy);
 * 3. the bytes are fetched with the service role and streamed back with the
 *    object's content-type, private-cacheable for an hour.
 *
 * Stable URL on purpose (no signed-URL expiry): the offline document cache
 * keys on it, and <img>/<a>/<iframe> consumers don't have to refresh.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path: segs } = await ctx.params;
  if (!isPrivateBucket(bucket)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const path = segs.map((s) => decodeURIComponent(s)).join("/");
  if (!path || path.includes("..")) return NextResponse.json({ error: "Bad path" }, { status: 400 });

  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ownerId, tripIds } = pathGrant(path);
  let allowed = ownerId === user.id;
  if (!allowed && tripIds.length) {
    const rows = await db
      .select({ tripId: tripMembers.tripId })
      .from(tripMembers)
      .where(and(eq(tripMembers.userId, user.id), inArray(tripMembers.tripId, tripIds)))
      .limit(1);
    allowed = rows.length > 0;
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filename = path.split("/").pop() ?? "file";
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
