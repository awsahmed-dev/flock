import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lightweight liveness + readiness probe.
 *
 * - `200 ok`  → app + database are responsive
 * - `503 db` → DB ping failed (DATABASE_URL bad, pooler down, RLS lock-up)
 *
 * Used by uptime monitoring (UptimeRobot, BetterStack, etc). Does NOT
 * touch Supabase Auth or external services — those have their own SLOs.
 */
export async function GET() {
  const started = Date.now();
  try {
    // Minimal round-trip: `SELECT 1`. Confirms the postgres pool is alive
    // and the connection string still works. Drizzle wraps it.
    await db.execute(sql`SELECT 1`);
    const ms = Date.now() - started;
    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        latencyMs: ms,
        ts: new Date().toISOString(),
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
        env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "fail",
        error: err?.message ?? String(err),
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
