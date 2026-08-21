import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { textSearch } from "@/lib/places/google";
import { warmCache } from "@/lib/places/cache";
import { isOverCap } from "@/lib/places/meter";
import type { Place } from "@/lib/places/types";

export const maxDuration = 60;

/**
 * Inspiration import — the camera-roll front door. POST one of:
 *   { url }                        a TikTok / Instagram / blog / Maps link
 *   { text }                       pasted caption, article, notes
 *   { image: base64, mediaType }   a screenshot of a post / list / map
 * plus { tripId }.
 *
 * Flow: (fetch the URL server-side when given) → Haiku forced-tool extracts
 * place NAMES (never invents) → each name grounded through Google Places
 * text search scoped to the trip's destination → real Place objects, warmed
 * into the cache so hearts/opens are free. Never saves anything: the client
 * shows the cards and the traveller chooses.
 */
const SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    places: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "The place's proper name, as searchable on a map (e.g. 'Shinjuku Gyoen', 'Ichiran Shibuya')" },
          area: { type: ["string", "null"], description: "Neighbourhood / city if stated (e.g. 'Shibuya')" },
        },
        required: ["name"],
      },
    },
    reason: { type: ["string", "null"], description: "If places is empty: one short sentence why" },
  },
  required: ["places"],
};

async function fetchUrlText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // A plain browser UA — link previews (og tags) are served to anyone.
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "en,ar;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const metas: string[] = [];
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:title|og:description|twitter:title|twitter:description|description)["'][^>]+content=["']([^"']{2,500})["']/gi)) metas.push(m[1]);
    for (const m of html.matchAll(/<meta[^>]+content=["']([^"']{2,500})["'][^>]+(?:property|name)=["'](?:og:title|og:description|twitter:title|twitter:description|description)["']/gi)) metas.push(m[1]);
    const title = html.match(/<title[^>]*>([^<]{2,300})<\/title>/i)?.[1];
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 6000);
    const out = [title, ...metas, body].filter(Boolean).join("\n").trim();
    return out.length > 40 ? out : out || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { tripId?: string; url?: string; text?: string; image?: string; mediaType?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  if (!body.tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });
  const trip = await getTripWithMembership(body.tripId, user.id);
  if (!trip) return NextResponse.json({ error: "not found" }, { status: 404 });

  const image = body.image?.replace(/^data:[\w/+.-]+;base64,/, "");
  const url = body.url?.trim().slice(0, 2000);
  const text = body.text?.trim().slice(0, 12_000) ?? "";
  if (!image && !text && !url) return NextResponse.json({ error: "nothing to read" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ places: [], misses: [], reason: "AI extraction is not configured" }, { status: 200 });
  if (await isOverCap()) return NextResponse.json({ places: [], misses: [], reason: "Place search is at its daily cap — try again tomorrow" }, { status: 200 });

  let fetched: string | null = null;
  if (url && /^https?:\/\//i.test(url)) fetched = await fetchUrlText(url);

  const context = `Trip destination: ${trip.destination}.
Extract every REAL, MAP-SEARCHABLE place (restaurant, café, sight, park, shop, hotel, viewpoint…) mentioned. Rules: proper names only, exactly as written — NEVER invent, translate, or "improve" a name; skip generic phrases ("a cute café"), cities alone, and places obviously outside the trip's destination country; max 8, order of appearance. If nothing is extractable, return places: [] with a short reason.`;

  const anthropic = new Anthropic({ apiKey });
  const content: Anthropic.MessageParam["content"] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: (body.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif") ?? "image/jpeg", data: image } });
  const source = image
    ? "Read the places in this screenshot."
    : fetched
      ? `Read the places in this page content (from ${url}):\n\n${fetched}${text ? `\n\nThe traveller also pasted:\n${text}` : ""}`
      : url && !text
        ? `Only this URL is available (the page could not be fetched). Extract place names ONLY if the URL itself literally contains them; otherwise return places: [].\n\n${url}`
        : `Read the places in this text:\n\n${text}`;
  content.push({ type: "text", text: `${context}\n\n${source}` });

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content }],
      tools: [{ name: "emit_places", description: "Emit the places found.", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "emit_places" },
    });
    const block = res.content.find((b) => b.type === "tool_use");
    const raw = block && block.type === "tool_use" ? (block.input as { places?: { name?: string; area?: string | null }[]; reason?: string }) : { places: [] };
    const names = (raw.places ?? [])
      .map((p) => ({ name: String(p?.name ?? "").trim().slice(0, 120), area: p?.area ? String(p.area).trim().slice(0, 80) : null }))
      .filter((p) => p.name.length > 1)
      .slice(0, 8);
    if (!names.length) return NextResponse.json({ places: [], misses: [], reason: raw.reason ?? "No places found in that" });

    // Ground each name through Places, scoped to the destination.
    const grounded = await Promise.all(names.map(async (n) => {
      const q = `${n.name}${n.area ? `, ${n.area}` : ""}, ${trip.destination}`;
      const hits = await textSearch(q, { max: 1 }).catch(() => [] as Place[]);
      return { asked: n.name, place: hits[0] ?? null };
    }));
    const seen = new Set<string>();
    const places: Place[] = [];
    const misses: string[] = [];
    for (const g of grounded) {
      if (g.place && !seen.has(g.place.placeId)) { seen.add(g.place.placeId); places.push(g.place); }
      else if (!g.place) misses.push(g.asked);
    }
    void warmCache(places);
    return NextResponse.json({ places, misses, reason: places.length ? undefined : "Couldn't match those places on the map" });
  } catch (e) {
    console.error("[parse-inspiration]", e);
    return NextResponse.json({ places: [], misses: [], reason: "Couldn't read that — try pasting the text instead" }, { status: 200 });
  }
}
