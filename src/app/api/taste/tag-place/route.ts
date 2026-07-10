import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { placeTasteTags } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";

export const maxDuration = 30;

/**
 * Phase 6 §5-C — place tagging. POST { place_id, name, types, price_level,
 * editorial_summary } → Claude Haiku scores the five dimensions → row in
 * place_taste_tags. Idempotent (upsert); already-tagged places return fast.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    place_id?: string;
    name?: string;
    types?: string[];
    price_level?: number | null;
    editorial_summary?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.place_id || !body.name) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const existing = await db.query.placeTasteTags.findFirst({
    where: (t, { eq }) => eq(t.placeId, body.place_id!),
  });
  if (existing) return NextResponse.json({ tags: existing, cached: true });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ tags: null }, { status: 200 });

  const anthropic = new Anthropic({ apiKey });
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are tagging a travel place on 5 taste dimensions (0–100).
Place: "${body.name}" | Types: ${(body.types ?? []).join(", ")} | Price level: ${body.price_level ?? "?"}/4
Summary: "${body.editorial_summary ?? ""}"

Respond with JSON only:
{
  "budget": <0=free/street, 100=Michelin/luxury>,
  "discovery": <0=iconic tourist, 100=hidden local gem>,
  "energy": <0=chill sit-down, 100=active intense>,
  "vibe": <0=photogenic/aesthetic, 100=authentic/raw local>,
  "depth": <0=quick visit, 100=hours of cultural immersion>
}`,
        },
      ],
    });
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ tags: null });
    const parsed = JSON.parse(match[0]);
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 50)));
    const tags = {
      placeId: body.place_id,
      budget: clamp(parsed.budget),
      discovery: clamp(parsed.discovery),
      energy: clamp(parsed.energy),
      vibe: clamp(parsed.vibe),
      depth: clamp(parsed.depth),
    };
    await db.insert(placeTasteTags).values(tags).onConflictDoNothing();
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json({ tags: null });
  }
}
