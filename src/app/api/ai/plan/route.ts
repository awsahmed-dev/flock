import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export interface PlannedActivity {
  day: number;
  title: string;
  type: "activity" | "accommodation" | "transport" | "meal";
  startTime?: string;
  locationName?: string;
  costEstimate?: number;
}

export interface AiPlannerResult {
  summary: string;
  tips: string[];
  activities: PlannedActivity[];
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

// Parse pipe-delimited lines: DAY|TYPE|TIME|COST|TITLE|PLACE
function parseLines(prefix: string, raw: string): PlannedActivity[] {
  const lines = (prefix + raw)
    .trim()
    .split("\n")
    .filter((l) => l.includes("|"));

  return lines
    .map((line) => {
      const p = line.split("|");
      const day = parseInt(p[0]);
      const type = (p[1]?.trim().toLowerCase() as PlannedActivity["type"]) ?? "activity";
      const time = p[2]?.trim();
      const cost = parseFloat(p[3]) || 0;
      const title = p[4]?.trim();
      const place = p[5]?.trim();
      if (!day || !title) return null;
      return {
        day,
        title,
        type: ["activity", "accommodation", "transport", "meal"].includes(type)
          ? type
          : "activity",
        startTime: time || undefined,
        locationName: place || undefined,
        costEstimate: cost > 0 ? cost : undefined,
      } as PlannedActivity;
    })
    .filter((a): a is PlannedActivity => a !== null);
}

// Split days into chunks of 3 for parallel calls
function chunkDays(numDays: number): Array<{ days: string; startDay: number }> {
  const chunks: Array<{ days: string; startDay: number }> = [];
  for (let i = 1; i <= numDays; i += 3) {
    const end = Math.min(i + 2, numDays);
    const days = Array.from({ length: end - i + 1 }, (_, k) => i + k).join(",");
    chunks.push({ days, startDay: i });
  }
  return chunks;
}

const STYLE_DESC: Record<string, string> = {
  adventure: "outdoor activities, hiking, nature exploration",
  relaxed: "slow pace, beaches, spas, scenic walks",
  cultural: "museums, historical sites, art, local traditions",
  foodie: "local restaurants, street food, food markets",
  budget: "free attractions, affordable eats, local transport",
  luxury: "fine dining, premium experiences, private tours",
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { tripId, travelStyle = "cultural", interests = "", notes = "" } = body;

    if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI planner is not configured. Set ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }

    const trip = await getTripWithMembership(tripId, user.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const numDays = daysBetween(trip.startDate, trip.endDate);
    const memberCount = trip.members.length;
    const styleHint = STYLE_DESC[travelStyle] ?? "general sightseeing";
    const context = [
      `${numDays}-day trip to ${trip.destination}`,
      `${memberCount} people`,
      `Style: ${travelStyle} (${styleHint})`,
      trip.budgetTotal
        ? `Budget: $${trip.budgetTotal} total (~$${Math.round(trip.budgetTotal / memberCount)}/person)`
        : null,
      interests ? `Interests: ${interests}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join(". ");

    const client = new Anthropic({ apiKey });

    // Chunk into 3-day groups and run in parallel for speed
    const chunks = chunkDays(numDays);

    const chunkResults = await Promise.all(
      chunks.map(({ days, startDay }) =>
        client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: `${context}. Generate activities for days ${days} only. Format: one line per activity: DAY|TYPE|TIME|COST|TITLE|PLACE. TYPE=activity/meal/transport/accommodation. COST in USD per person (0 if free). 3 per day. No extra text.`,
            },
            // Prefill forces the model to start directly with day number, no fences
            { role: "assistant", content: `${startDay}|` },
          ],
        })
      )
    );

    // Merge all activities
    const activities: PlannedActivity[] = [];
    chunks.forEach(({ startDay }, idx) => {
      const raw = chunkResults[idx].content[0]?.type === "text"
        ? chunkResults[idx].content[0].text
        : "";
      activities.push(...parseLines(`${startDay}|`, raw));
    });

    // Generate summary + tips in a single fast call
    const metaRes = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `${context}. Give a 1-sentence trip summary and 3 practical tips as JSON. No fences.`,
        },
        { role: "assistant", content: '{"summary":"' },
      ],
    });

    let summary = "Your trip is all planned — check the activities below!";
    let tips: string[] = [];
    try {
      const metaRaw = metaRes.content[0]?.type === "text" ? metaRes.content[0].text : "";
      const metaText = '{"summary":"' + metaRaw.trim();
      // ensure it ends with }
      const cleaned = metaText.endsWith("}") ? metaText : metaText + "}";
      const meta = JSON.parse(cleaned);
      if (meta.summary) summary = meta.summary;
      if (Array.isArray(meta.tips)) tips = meta.tips.slice(0, 3);
    } catch {
      // fallback — keep defaults
    }

    const result: AiPlannerResult = { summary, tips, activities };
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI planner error:", error);
    if (error?.status === 401)
      return NextResponse.json({ error: "AI API key is invalid" }, { status: 503 });
    if (error?.status === 429)
      return NextResponse.json({ error: "AI rate limit — try again in a moment" }, { status: 429 });
    return NextResponse.json({ error: error?.message ?? "Failed to generate plan" }, { status: 500 });
  }
}
