import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { trips, chatMessages, itineraryItems } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Pre-trip nudge cron — runs daily (configured via vercel.json `crons`).
 * For every trip whose start date is exactly 30 / 14 / 7 / 1 days away,
 * post one AI-generated checklist message into the trip chat.
 *
 * Idempotent — looks up prior `pre_trip_nudge` metadata on chat_messages
 * before posting at each milestone.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer $CRON_SECRET`. We accept
 * either that header or a `?secret=` query for manual triggers.
 */

const MILESTONES = [30, 14, 7, 1] as const;
type Milestone = (typeof MILESTONES)[number];

const FALLBACK_NUDGES: Record<Milestone, (destination: string) => string> = {
  30: (d) => `One month until ${d}. Time to lock in flights and the main accommodation. Anyone still need to book?`,
  14: (d) => `Two weeks until ${d}. Activities worth booking now: anything time-slotted (shows, popular tours). Visas / travel insurance sorted?`,
  7: (d) => `One week to go! Pack list, currency, eSIM, offline maps — sweep through and call out anything missing.`,
  1: (d) => `${d} tomorrow. Final check: passports, chargers, any printed confirmations. Have a great trip!`,
};

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured — allow (developer mode). In prod, set CRON_SECRET.
    return true;
  }
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

async function buildNudgeBody(
  client: Anthropic | null,
  milestone: Milestone,
  destination: string,
  itemCount: number,
): Promise<string> {
  if (!client) return FALLBACK_NUDGES[milestone](destination);
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 140,
      messages: [
        {
          role: "user",
          content: `Group trip to ${destination}. ${milestone} day(s) until departure. The group has ${itemCount} itinerary item${itemCount === 1 ? "" : "s"} planned. Write ONE chat message (under 35 words) nudging the group on what to handle now. Casual tone, plain text, no greeting, no fences. Mention 1-2 concrete things they should action at this stage.`,
        },
      ],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    if (text && text.length > 0 && text.length < 320) return text;
  } catch {
    // fall through
  }
  return FALLBACK_NUDGES[milestone](destination);
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  const results: Array<{ tripId: string; milestone: Milestone; posted: boolean; reason?: string }> = [];

  // For each milestone, find trips starting exactly N days from today
  for (const milestone of MILESTONES) {
    const target = new Date();
    target.setUTCHours(0, 0, 0, 0);
    target.setUTCDate(target.getUTCDate() + milestone);
    const targetIso = target.toISOString().slice(0, 10);

    const matching = await db
      .select({
        id: trips.id,
        destination: trips.destination,
        createdBy: trips.createdBy,
      })
      .from(trips)
      .where(eq(trips.startDate, targetIso));

    for (const trip of matching) {
      try {
        // Idempotency: skip if we've already posted this milestone
        const prior = await db.query.chatMessages.findMany({
          where: and(
            eq(chatMessages.tripId, trip.id),
            sql`${chatMessages.metadata}->>'kind' = 'pre_trip_nudge'`,
          ),
          columns: { id: true, metadata: true },
        });
        if (prior.some((m) => (m.metadata as any)?.milestone === milestone)) {
          results.push({ tripId: trip.id, milestone, posted: false, reason: "already_posted" });
          continue;
        }

        const items = await db
          .select({ id: itineraryItems.id })
          .from(itineraryItems)
          .where(eq(itineraryItems.tripId, trip.id));

        const body = await buildNudgeBody(client, milestone, trip.destination, items.length);

        await db.insert(chatMessages).values({
          tripId: trip.id,
          userId: trip.createdBy,
          body: `🤖 ${body}`,
          type: "text",
          metadata: {
            kind: "pre_trip_nudge",
            milestone,
            generatedAt: new Date().toISOString(),
          },
        });

        results.push({ tripId: trip.id, milestone, posted: true });
      } catch (err: any) {
        console.error(`[cron/pre-trip-nudge] trip ${trip.id} milestone ${milestone}:`, err?.message ?? err);
        results.push({ tripId: trip.id, milestone, posted: false, reason: "error" });
      }
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
