import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { checkLimit } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n";

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

interface CityLeg {
  city: string;
  days: number[]; // 1-indexed trip days
}

/**
 * B18: ask the model to plan the city sequence first. For single-city
 * trips this is trivial (every day in that one city); for multi-city
 * trips this is where logic matters most — geographically continuous
 * routing with no zigzag backtracks. We do this as a tiny upfront call
 * so the day-expansion calls below can be locked to one city per day.
 */
async function planCityRoute(
  client: Anthropic,
  args: {
    destination: string;
    numDays: number;
    travelStyle: string;
    pace: string;
    interests: string;
    mustSee: string;
  },
): Promise<CityLeg[]> {
  const isMultiCity = args.destination.includes(",") ||
    args.destination.toLowerCase().includes(" and ") ||
    /\bmulti\b/i.test(args.destination);
  if (!isMultiCity) {
    // Single city — no routing logic needed
    return [
      {
        city: args.destination.trim(),
        days: Array.from({ length: args.numDays }, (_, i) => i + 1),
      },
    ];
  }

  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 250,
    messages: [
      {
        role: "user",
        content:
          `Plan the city sequence for a ${args.numDays}-day trip to ${args.destination}. ` +
          `Style: ${args.travelStyle}. Pace: ${args.pace}.` +
          (args.mustSee ? ` Must-see: ${args.mustSee}.` : "") +
          (args.interests ? ` Interests: ${args.interests}.` : "") +
          ` Rules: (1) Each city must be a contiguous block of days — no zigzagging. ` +
          `(2) Order cities so total travel distance is minimized — group geographic neighbors. ` +
          `(3) Allocate 2-4 nights per city based on what each offers. ` +
          `(4) Start and end in the same gateway city when it's the only international airport. ` +
          `Output format: one line per leg as CITY|FIRST_DAY|LAST_DAY (1-indexed). ` +
          `No commentary, no extra text.`,
      },
      { role: "assistant", content: "" },
    ],
  });

  const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
  const legs: CityLeg[] = raw
    .trim()
    .split("\n")
    .map((line) => {
      const p = line.split("|").map((s) => s.trim());
      const city = p[0];
      const first = parseInt(p[1]);
      const last = parseInt(p[2]);
      if (!city || isNaN(first) || isNaN(last) || first > last) return null;
      const days = Array.from({ length: last - first + 1 }, (_, i) => first + i);
      return { city, days };
    })
    .filter((l): l is CityLeg => l !== null)
    .filter((l) => l.days.every((d) => d >= 1 && d <= args.numDays));

  // Sanity check: every trip day must be assigned. If the model didn't
  // cover all days, fall back to single-city (gateway-only) assignment.
  const covered = new Set<number>();
  legs.forEach((l) => l.days.forEach((d) => covered.add(d)));
  const allCovered =
    Array.from({ length: args.numDays }, (_, i) => i + 1).every((d) =>
      covered.has(d),
    );
  if (!allCovered || legs.length === 0) {
    return [
      {
        city: args.destination.split(",")[0].trim(),
        days: Array.from({ length: args.numDays }, (_, i) => i + 1),
      },
    ];
  }
  return legs;
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

    // Plan generation is expensive (multiple Haiku calls). Cap at ~3
    // generations every 5 minutes per user — plenty for legit re-runs,
    // hard ceiling for scripted abuse.
    const limit = checkLimit(`ai:plan:${user.id}`, {
      capacity: 3,
      refillPerSec: 1 / 100, // ~1 token every 100s → full bucket in 5 min
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Slow down — try again in ${limit.retryAfter}s` },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
      );
    }

    const body = await request.json();
    const {
      tripId,
      travelStyle = "cultural",
      interests = "",
      notes = "",
      // B3-b: questionnaire fields. All optional — the planner gracefully
      // degrades to the legacy 3-field flow when these are missing.
      pace = "balanced",          // "chill" | "balanced" | "packed"
      dailyBudget = "mid",         // "shoestring" | "mid" | "splurge"
      dietary = [] as string[],   // ["vegetarian", "halal", ...]
      mustSee = "",
      avoid = "",
    } = body;

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

    // B15-d: read locale from the cookie so the LLM responds in the
    // user's UI language.
    const locale = await getLocale();

    const numDays = daysBetween(trip.startDate, trip.endDate);
    const memberCount = trip.members.length;
    const styleHint = STYLE_DESC[travelStyle] ?? "general sightseeing";
    const PACE_DESC: Record<string, string> = {
      chill: "2-3 activities/day, plenty of downtime, late mornings",
      balanced: "3-4 activities/day, mix of effort and rest",
      packed: "5+ activities/day, dawn-to-dusk, no idle time",
    };
    const BUDGET_DESC: Record<string, string> = {
      shoestring: "cheapest options: street food, free attractions, public transit",
      mid: "moderate: casual restaurants, paid attractions OK, ride-shares fine",
      splurge: "premium: fine dining, private experiences, taxis welcome",
    };

    // B15-d: locale-aware output. If the viewer's UI is Arabic the
    // LLM should respond in Modern Standard Arabic so the day cards
    // don't read like a half-translated brochure. We instruct the
    // model rather than translate output post-hoc — cheaper and gives
    // better names ("معبد كيوميزو" vs. transliterated "Kiyomizu-dera").
    // The PLACE column feeds a geocoder (Nominatim/Mapbox) and must use
    // the place's local-language Latin-script form even when the rest of
    // the line is Arabic — otherwise the pin can't be found on the map.
    // E.g. write "Jalan Alor" not "جالان علور".
    const localeInstruction =
      locale === "ar"
        ? "Respond in Modern Standard Arabic (MSA) for TITLE. Use Western digits and ISO currency codes. CRITICAL: PLACE must always be the venue's real Latin-script name as it appears on Google Maps (e.g. 'Petronas Twin Towers', 'Jalan Alor', 'Batu Caves'), never an Arabic transliteration — it is used for map lookup, not display."
        : "Respond in English. PLACE must be the venue's real name as it appears on Google Maps.";

    const context = [
      `${numDays}-day trip to ${trip.destination}`,
      `${memberCount} people`,
      `Style: ${travelStyle} (${styleHint})`,
      `Pace: ${pace} (${PACE_DESC[pace] ?? "balanced rhythm"})`,
      `Daily budget vibe: ${dailyBudget} (${BUDGET_DESC[dailyBudget] ?? "moderate"})`,
      trip.budgetTotal
        ? `Total budget: $${trip.budgetTotal} (~$${Math.round(trip.budgetTotal / memberCount)}/person)`
        : null,
      Array.isArray(dietary) && dietary.length
        ? `Dietary needs: ${dietary.join(", ")} — ALL meal picks must respect these`
        : null,
      mustSee ? `Must-see / must-do: ${mustSee}` : null,
      avoid ? `Avoid: ${avoid}` : null,
      interests ? `Interests: ${interests}` : null,
      notes ? `Notes: ${notes}` : null,
      localeInstruction,
    ]
      .filter(Boolean)
      .join(". ");

    const client = new Anthropic({ apiKey });

    // B18: TripArchitect-Pro flow — first plan the city route, then
    // expand each city leg into structured day-by-day items. This kills
    // the old "jumps between cities mid-trip" bug because each leg is a
    // contiguous block of days locked to one city.
    const legs = await planCityRoute(client, {
      destination: trip.destination,
      numDays,
      travelStyle,
      pace,
      interests: interests || "",
      mustSee: mustSee || "",
    });

    // Items per day, derived from pace. Each item maps to a fixed slot
    // so the day reads as a real schedule (morning / lunch / afternoon /
    // dinner / evening) rather than a random pile of 3 things.
    const slotsByPace: Record<string, Array<{ time: string; type: PlannedActivity["type"]; label: string }>> = {
      chill: [
        { time: "10:00", type: "activity", label: "morning" },
        { time: "13:00", type: "meal", label: "lunch" },
        { time: "19:00", type: "meal", label: "dinner" },
      ],
      balanced: [
        { time: "09:30", type: "activity", label: "morning" },
        { time: "12:30", type: "meal", label: "lunch" },
        { time: "15:30", type: "activity", label: "afternoon" },
        { time: "19:30", type: "meal", label: "dinner" },
      ],
      packed: [
        { time: "08:30", type: "activity", label: "morning" },
        { time: "12:30", type: "meal", label: "lunch" },
        { time: "15:00", type: "activity", label: "afternoon" },
        { time: "18:30", type: "activity", label: "evening" },
        { time: "20:30", type: "meal", label: "dinner" },
      ],
    };
    const slots = slotsByPace[pace] ?? slotsByPace.balanced;
    const itemsPerDay = slots.length;

    // For each city leg, run one Haiku call covering that leg's days.
    // Parallel across legs. Each call gets the full pacing template +
    // the locked city + the user profile context.
    const legResults = await Promise.all(
      legs.map((leg) => {
        const daysStr = leg.days.join(",");
        const slotsStr = slots
          .map((s, i) => `${i + 1}. ${s.label} (${s.time}, type=${s.type})`)
          .join("; ");
        return client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 200 * leg.days.length, // ~200 tokens/day worth of items
          messages: [
            {
              role: "user",
              content:
                `${context}. ` +
                `\n\nYou are planning days ${daysStr} of the trip — all in ${leg.city}. ` +
                `\nGenerate exactly ${itemsPerDay} items per day, in this order: ${slotsStr}. ` +
                `\n\nRules:` +
                `\n- Every PLACE must be a real venue in ${leg.city} with the city name appended: "Venue Name, ${leg.city}". This is critical for map lookup.` +
                `\n- Group items each day by neighborhood — minimize travel time between morning, lunch, afternoon, and dinner.` +
                `\n- Lunch and dinner picks must be near the activity that comes right before them.` +
                `\n- If a day is a travel day (arrival/departure between cities), make the first slot a "transport" type from the previous city.` +
                `\n\nOutput format: one line per item:` +
                `\nDAY|TYPE|TIME|COST|TITLE|PLACE_WITH_CITY` +
                `\n\nTYPE = activity / meal / transport / accommodation. COST in USD per person. ` +
                `\nNo extra text, no headings, no commentary.`,
            },
            { role: "assistant", content: `${leg.days[0]}|` },
          ],
        });
      }),
    );

    // Merge all activities
    const activities: PlannedActivity[] = [];
    legs.forEach((leg, idx) => {
      const raw = legResults[idx].content[0]?.type === "text"
        ? legResults[idx].content[0].text
        : "";
      activities.push(...parseLines(`${leg.days[0]}|`, raw));
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
