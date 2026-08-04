import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { checkLimit } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n";
import { textSearch, photoMediaUrl, PlacesNotConfiguredError } from "@/lib/places/google";
import type { Place } from "@/lib/places/types";
import { isOverCap } from "@/lib/places/meter";
import { db } from "@/lib/db";
import { tasteProfiles } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * AI planner v2 — grounded, per the v2-discovery spec: the model never
 * invents a place. Two modes:
 *
 *  mode="route"    → propose EDITABLE city legs (nights + travel hops).
 *                    The user adjusts them in the wizard before anything
 *                    else runs — fixes the "8 nights in one city, 1 in
 *                    the next" problem by making allocation a decision
 *                    the crew can see and change.
 *
 *  mode="assemble" → for ONE leg: Haiku writes Google search intents →
 *                    Places textSearch returns real candidates (photo,
 *                    rating, coords, localized names) → Sonnet assembles
 *                    days ONLY from those candidates. Output is real
 *                    place cards with Google Maps links.
 *
 * All user-visible text (why/notes/summary) is generated in the app
 * locale. Search queries stay Latin-script for recall; display names
 * come back from Google in the user's language.
 */

/* ── shared shapes ─────────────────────────────────────────────────── */

export interface RouteLeg {
  /** Latin-script city name as Google knows it — used for search. */
  city: string;
  /** Localized display name (= city when locale is en). */
  cityLabel: string;
  nights: number;
  /** one localized sentence: why this many nights here */
  why: string;
  /** how you get here from the previous leg (null for the first) */
  travel: { mode: "flight" | "train" | "bus" | "car" | "ferry" | "walk"; note: string } | null;
  /** real city photo (Google) so the route step sells the stop */
  photoUrl: string | null;
}

export interface PlannedPlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  photoUrl: string | null;
  address: string | null;
  category: string | null;
  placeTypes: string[];
  mapsUrl: string;
}

export interface AssembledItem {
  day: number; // 1-indexed trip day
  type: "activity" | "meal" | "transport" | "accommodation";
  startTime: string | null;
  note: string; // localized one-liner: why this pick
  place: PlannedPlace;
  /** a real alternative for the same slot — drives a Huddle vote */
  alt: PlannedPlace | null;
}

/* ── helpers ───────────────────────────────────────────────────────── */

function daysBetween(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
}

function mapsUrl(name: string, placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`;
}

function toPlanned(p: Place): PlannedPlace {
  return {
    placeId: p.placeId,
    name: p.name,
    lng: p.coords[0],
    lat: p.coords[1],
    rating: p.rating,
    userRatingsTotal: p.userRatingsTotal,
    priceLevel: p.priceLevel,
    photoUrl: p.photoRef ? photoMediaUrl(p.photoRef, 480) : null,
    address: p.address,
    category: p.category,
    placeTypes: p.placeTypes ?? [],
    mapsUrl: mapsUrl(p.name, p.placeId),
  };
}

/** Force a tool call and return its input. */
async function callTool<T>(
  client: Anthropic,
  args: {
    model: string;
    maxTokens: number;
    prompt: string;
    toolName: string;
    schema: Anthropic.Tool.InputSchema;
  },
): Promise<T> {
  const res = await client.messages.create({
    model: args.model,
    max_tokens: args.maxTokens,
    messages: [{ role: "user", content: args.prompt }],
    tools: [{ name: args.toolName, description: "Emit the result.", input_schema: args.schema }],
    tool_choice: { type: "tool", name: args.toolName },
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Model returned no structured output");
  return block.input as T;
}

const STYLE_DESC: Record<string, string> = {
  adventure: "outdoor activities, hiking, nature exploration",
  relaxed: "slow pace, beaches, spas, scenic walks",
  cultural: "museums, historical sites, art, local traditions",
  foodie: "local restaurants, street food, food markets",
  budget: "free attractions, affordable eats, local transport",
  luxury: "fine dining, premium experiences, private tours",
};

const PACE_ITEMS: Record<string, string> = {
  chill: "2-3 items per day with real downtime",
  balanced: "3-4 items per day",
  packed: "5-6 items per day, early starts",
};

interface Prefs {
  travelStyle: string;
  pace: string;
  dailyBudget: string;
  dietary: string[];
  interests: string;
  mustSee: string;
  avoid: string;
  /** arrival gateway — where the trip physically starts */
  startCity: string;
  /** departure gateway — where it ends (defaults to startCity) */
  endCity: string;
}

function prefsFromBody(body: Record<string, unknown>): Prefs {
  return {
    travelStyle: String(body.travelStyle ?? "cultural"),
    pace: String(body.pace ?? "balanced"),
    dailyBudget: String(body.dailyBudget ?? "mid"),
    dietary: Array.isArray(body.dietary) ? body.dietary.map(String) : [],
    interests: String(body.interests ?? ""),
    mustSee: String(body.mustSee ?? ""),
    avoid: String(body.avoid ?? ""),
    startCity: String(body.startCity ?? "").trim(),
    endCity: String(body.endCity ?? "").trim(),
  };
}

function prefsLines(p: Prefs, memberCount: number): string {
  return [
    `Group: ${memberCount} people`,
    `Style: ${p.travelStyle} (${STYLE_DESC[p.travelStyle] ?? "general sightseeing"})`,
    `Pace: ${p.pace} (${PACE_ITEMS[p.pace] ?? PACE_ITEMS.balanced})`,
    `Budget vibe: ${p.dailyBudget}`,
    p.dietary.length ? `Dietary (HARD requirement for every food pick): ${p.dietary.join(", ")}` : null,
    p.mustSee ? `Must-see: ${p.mustSee}` : null,
    p.avoid ? `Avoid: ${p.avoid}` : null,
    p.interests ? `Interests: ${p.interests}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Crew taste vector (aggregate row, userId NULL) — best-effort flavor. */
async function crewTasteLine(tripId: string): Promise<string | null> {
  try {
    const row = await db.query.tasteProfiles.findFirst({
      where: and(eq(tasteProfiles.tripId, tripId), isNull(tasteProfiles.userId)),
    });
    const vec = row?.vector as Record<string, number> | null;
    if (!vec) return null;
    const top = Object.entries(vec)
      .filter(([, w]) => typeof w === "number" && w > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, w]) => `${tag} (${w.toFixed(2)})`);
    return top.length ? `Crew taste signals (learned from their in-app activity): ${top.join(", ")}` : null;
  } catch {
    return null;
  }
}

const localeRule = (locale: string) =>
  locale === "ar"
    ? "Every user-visible string you emit (why, note, summary, travel notes, cityLabel) MUST be in Modern Standard Arabic — warm and concise, Western digits."
    : "Every user-visible string you emit must be in natural, concise English.";

/* ── mode: route ───────────────────────────────────────────────────── */

async function handleRoute(
  client: Anthropic,
  trip: { destination: string | null },
  numDays: number,
  memberCount: number,
  prefs: Prefs,
  locale: string,
) {
  const schema: Anthropic.Tool.InputSchema = {
    type: "object",
    properties: {
      legs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            city: { type: "string", description: "Latin-script city name as on Google Maps" },
            cityLabel: { type: "string", description: "City name in the user's language" },
            nights: { type: "integer", minimum: 1 },
            why: { type: "string", description: "One short localized sentence: why this allocation" },
            travelMode: { type: "string", enum: ["flight", "train", "bus", "car", "ferry", "walk", "none"] },
            travelNote: { type: "string", description: "Localized: how you get here from the previous city + rough duration. Empty for the first leg." },
          },
          required: ["city", "cityLabel", "nights", "why", "travelMode", "travelNote"],
        },
      },
    },
    required: ["legs"],
  };

  const out = await callTool<{
    legs: { city: string; cityLabel: string; nights: number; why: string; travelMode: string; travelNote: string }[];
  }>(client, {
    model: "claude-haiku-4-5",
    maxTokens: 1200,
    toolName: "emit_route",
    schema,
    prompt:
      `Propose the city route for a ${numDays}-day trip to "${trip.destination}".\n` +
      `${prefsLines(prefs, memberCount)}\n` +
      (prefs.startCity
        ? `The trip STARTS in ${prefs.startCity} (arrival gateway) — the first leg must be there or begin from it.\n`
        : `Assume arrival at the destination's main international gateway; start the route there.\n`) +
      (prefs.endCity
        ? `The trip ENDS in ${prefs.endCity} (departure gateway) — the last leg must be there or route back to it.\n`
        : prefs.startCity
          ? `Departure is from ${prefs.startCity} too — the route must loop back cheaply (last leg = ${prefs.startCity} or a short hop away; mention the return in its travelNote).\n`
          : "") +
      `Rules:\n` +
      `- Nights across all legs MUST sum to exactly ${numDays}.\n` +
      `- BALANCE the allocation to each city's actual depth of things to do for this group's style — never dump most nights in one city while starving another unless it truly deserves it; justify in 'why'.\n` +
      `- 'why' must SELL the stop: its one wow factor + why this many nights (e.g. "قلب طوكيو الحديث — المعابد والأسواق وأفضل طعام في اليابان").\n` +
      `- Contiguous blocks only, geographic order that minimizes backtracking.\n` +
      `- Single-city destination → exactly one leg with all ${numDays} nights.\n` +
      `- travelMode/travelNote: the realistic way to reach each city from the previous one with a rough duration. First leg: travelMode "none", empty note.\n` +
      `${localeRule(locale)}`,
  });

  // Normalize + hard-enforce the nights budget.
  let legs = (out.legs ?? [])
    .filter((l) => l.city && l.nights >= 1)
    .map<RouteLeg>((l) => ({
      city: l.city.trim(),
      cityLabel: (l.cityLabel || l.city).trim(),
      nights: Math.max(1, Math.round(l.nights)),
      why: l.why ?? "",
      travel:
        l.travelMode && l.travelMode !== "none"
          ? { mode: l.travelMode as NonNullable<RouteLeg["travel"]>["mode"], note: l.travelNote ?? "" }
          : null,
      photoUrl: null,
    }));

  if (legs.length === 0) {
    const fallback = (trip.destination ?? "").split(",")[0].trim();
    legs = [{ city: fallback, cityLabel: fallback, nights: numDays, why: "", travel: null, photoUrl: null }];
  }
  // Clamp total nights to numDays (trim from the end / pad the last leg).
  let total = legs.reduce((s, l) => s + l.nights, 0);
  while (total > numDays && legs.length) {
    const last = legs[legs.length - 1];
    const over = total - numDays;
    if (last.nights > over) {
      last.nights -= over;
      total = numDays;
    } else {
      total -= last.nights;
      legs.pop();
    }
  }
  if (total < numDays && legs.length) {
    legs[legs.length - 1].nights += numDays - total;
  }

  // Real city photos so the route step sells each stop (one cheap
  // text search per city, capped + best-effort).
  if (!(await isOverCap())) {
    const shots = await Promise.allSettled(
      legs.map((l) => textSearch(l.city, { max: 1, languageCode: locale === "ar" ? "ar" : "en" })),
    );
    shots.forEach((s, i) => {
      if (s.status === "fulfilled" && s.value[0]?.photoRef) {
        legs[i].photoUrl = photoMediaUrl(s.value[0].photoRef, 640);
      }
    });
  }

  return NextResponse.json({ legs, numDays });
}

/* ── mode: assemble (one leg) ──────────────────────────────────────── */

async function handleAssemble(
  client: Anthropic,
  args: {
    tripId: string;
    destination: string;
    leg: { city: string; days: number[] };
    prefs: Prefs;
    memberCount: number;
    locale: string;
  },
) {
  const { leg, prefs, locale } = args;
  if (!leg?.city || !Array.isArray(leg.days) || leg.days.length === 0) {
    return NextResponse.json({ error: "Bad leg" }, { status: 400 });
  }
  if (await isOverCap()) {
    return NextResponse.json(
      { error: "Place discovery hit today's usage cap — try again tomorrow." },
      { status: 429 },
    );
  }

  const taste = await crewTasteLine(args.tripId);

  // 1) Haiku turns prefs into concrete Google search intents.
  const intentSchema: Anthropic.Tool.InputSchema = {
    type: "object",
    properties: {
      intents: {
        type: "array",
        items: { type: "string" },
        description: "5-8 Google Maps text searches, English/Latin script, each ending with the city name",
      },
    },
    required: ["intents"],
  };
  const { intents } = await callTool<{ intents: string[] }>(client, {
    model: "claude-haiku-4-5",
    maxTokens: 500,
    toolName: "emit_intents",
    schema: intentSchema,
    prompt:
      `Write Google Maps search queries to find real places for ${leg.days.length} day(s) in ${leg.city}.\n` +
      `${prefsLines(prefs, args.memberCount)}\n` +
      (taste ? `${taste}\n` : "") +
      `Mix (in this order of importance):\n` +
      `1. TWO queries for the city's world-famous, iconic sights — the places everyone flies there for. Name them explicitly when you know them (e.g. "Senso-ji temple ${leg.city}", "Shibuya crossing ${leg.city}").\n` +
      `2. Food queries matching the group (dish names, neighborhoods). Dietary rules apply ONLY to food/restaurant queries — NEVER put dietary words in sightseeing queries.\n` +
      `3. One local-gem query and one relaxing/evening option for this style.\n` +
      `5-8 queries total, each must include "${leg.city}".`,
  });

  // 2) Real candidates from Google Places. Seed a guaranteed iconic
  // query so a bad intent batch can never produce a plan with no
  // famous landmarks (the "went to Tokyo, saw no Tokyo" bug).
  const modelQueries = (intents ?? []).filter(Boolean).slice(0, 7);
  if (modelQueries.length === 0) return NextResponse.json({ error: "No search intents" }, { status: 502 });
  const queries = [`top tourist attractions in ${leg.city}`, ...modelQueries];

  const settled = await Promise.allSettled(
    queries.map((q) => textSearch(q, { max: 5, languageCode: locale === "ar" ? "ar" : "en" })),
  );
  const seen = new Set<string>();
  const candidates: Place[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const p of s.value) {
      if (seen.has(p.placeId)) continue;
      seen.add(p.placeId);
      candidates.push(p);
    }
  }
  if (candidates.length < 3) {
    return NextResponse.json(
      { error: "Couldn't find enough real places for this leg — try adjusting interests." },
      { status: 502 },
    );
  }
  const short = candidates.slice(0, 40);
  const catalog = short
    .map(
      (p, i) =>
        `${i}| ${p.name} | ${p.category ?? p.placeTypes?.[0] ?? "?"} | ★${p.rating ?? "?"} (${p.userRatingsTotal ?? 0}) | price ${p.priceLevel ?? "?"} | ${p.address ?? ""}`,
    )
    .join("\n");

  // 3) Sonnet assembles days ONLY from the catalog.
  const assembleSchema: Anthropic.Tool.InputSchema = {
    type: "object",
    properties: {
      summary: { type: "string", description: "2 localized sentences selling this leg's plan" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            c: { type: "integer", description: "candidate index from the catalog" },
            day: { type: "integer", description: `one of: ${leg.days.join(", ")}` },
            type: { type: "string", enum: ["activity", "meal"] },
            startTime: { type: "string", description: "HH:MM 24h" },
            note: { type: "string", description: "One short localized line: why this pick for THIS crew" },
            alt: { type: "integer", description: "OPTIONAL: a genuinely competing candidate index for the same slot — only when the crew should vote" },
          },
          required: ["c", "day", "type", "startTime", "note"],
        },
      },
    },
    required: ["summary", "items"],
  };

  const out = await callTool<{
    summary: string;
    items: { c: number; day: number; type: string; startTime: string; note: string; alt?: number }[];
  }>(client, {
    model: "claude-sonnet-5",
    maxTokens: 2500,
    toolName: "emit_days",
    schema: assembleSchema,
    prompt:
      `Assemble a day-by-day plan for ${leg.city} using ONLY the real places below (reference by index). Days to fill: ${leg.days.join(", ")}.\n` +
      `${prefsLines(prefs, args.memberCount)}\n` +
      (taste ? `${taste}\n` : "") +
      `CATALOG (index| name | category | rating (reviews) | price | address):\n${catalog}\n` +
      `Rules:\n` +
      `- ${PACE_ITEMS[prefs.pace] ?? PACE_ITEMS.balanced}; include lunch AND dinner each day from meal-appropriate candidates.\n` +
      `- EVERY day must anchor on at least one famous, high-review-count signature sight (the reason people visit ${leg.city}); gems and food are built around those anchors.\n` +
      `- Prefer high ratings with meaningful review counts; a hidden gem (fewer reviews) is welcome when it clearly fits the crew — say so in the note.\n` +
      `- Cluster each day geographically (use the addresses).\n` +
      `- Use 'alt' sparingly: only when two candidates genuinely compete for the same slot and the crew should decide.\n` +
      `- Never invent a place; if the catalog is thin for a slot, leave the slot out.\n` +
      `${localeRule(locale)}`,
  });

  const items: AssembledItem[] = (out.items ?? [])
    .filter((it) => short[it.c] && leg.days.includes(it.day))
    .map((it) => ({
      day: it.day,
      type: it.type === "meal" ? "meal" : "activity",
      startTime: /^\d{1,2}:\d{2}$/.test(it.startTime) ? it.startTime : null,
      note: it.note ?? "",
      place: toPlanned(short[it.c]),
      alt: it.alt != null && short[it.alt] && it.alt !== it.c ? toPlanned(short[it.alt]) : null,
    }));

  if (items.length === 0) {
    return NextResponse.json({ error: "The model produced no usable items — try again." }, { status: 502 });
  }

  return NextResponse.json({ summary: out.summary ?? "", items });
}

/* ── entry ─────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const mode = body.mode === "assemble" ? "assemble" : "route";
    const tripId = String(body.tripId ?? "");
    if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });

    // Route proposals are cheap; assembly runs once per leg — budget for
    // a multi-leg trip plus retries without opening the door to abuse.
    const limit = checkLimit(`ai:plan:${mode}:${user.id}`, {
      capacity: mode === "route" ? 4 : 14,
      refillPerSec: mode === "route" ? 1 / 75 : 1 / 45,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Slow down — try again in ${limit.retryAfter}s` },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI planner is not configured. Set ANTHROPIC_API_KEY." },
        { status: 503 },
      );
    }

    const trip = await getTripWithMembership(tripId, user.id);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const locale = await getLocale();
    const numDays = daysBetween(trip.startDate, trip.endDate);
    const prefs = prefsFromBody(body);
    const client = new Anthropic({ apiKey });

    if (mode === "route") {
      return await handleRoute(client, trip, numDays, trip.members.length, prefs, locale);
    }
    return await handleAssemble(client, {
      tripId,
      destination: trip.destination ?? "",
      leg: body.leg as { city: string; days: number[] },
      prefs,
      memberCount: trip.members.length,
      locale,
    });
  } catch (err) {
    if (err instanceof PlacesNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[ai/plan]", err);
    return NextResponse.json({ error: "Planner failed — please try again." }, { status: 500 });
  }
}
