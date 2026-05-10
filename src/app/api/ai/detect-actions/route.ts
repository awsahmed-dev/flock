import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";
import { checkLimit } from "@/lib/rate-limit";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

/**
 * Smart action detector — given a freeform chat message, return up to 3
 * actionable chip suggestions ("Add to plan" / "Log expense" / "Open vote").
 *
 * Cheap, fast Haiku call; stays under ~200 input tokens. Designed to be
 * fired-and-forgotten from the client whenever the author sends a message —
 * if it returns nothing, no chips render. We deliberately stay schema-strict
 * so the client can blindly trust the JSON.
 */

export type DetectedAction =
  | {
      kind: "itinerary";
      title: string;
      type: "activity" | "meal" | "accommodation" | "transport";
      cost?: number;
      locationName?: string;
    }
  | {
      kind: "expense";
      title: string;
      amount: number;
      category: "accommodation" | "transport" | "food" | "activity" | "shopping" | "other";
    }
  | {
      kind: "vote";
      question: string;
      options: string[];
    };

export interface DetectActionsResponse {
  actions: DetectedAction[];
}

// Tiny in-memory cache so the same message doesn't get re-classified on
// re-render or polling refresh. Key by tripId+body+author. Max 200 entries.
const cache = new Map<string, DetectedAction[]>();
function cacheGet(key: string) {
  return cache.get(key);
}
function cacheSet(key: string, value: DetectedAction[]) {
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, value);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Per-user rate limit: ~30 detections/min sustained, burst of 30.
    // detect-actions fires on every sent message; legit usage is well under
    // this, but a hammering script gets cut off fast.
    const limit = checkLimit(`ai:detect:${user.id}`, {
      capacity: 30,
      refillPerSec: 0.5,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Rate limit — slow down", actions: [] },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
      );
    }

    const { tripId, body } = (await request.json()) as { tripId?: string; body?: string };
    if (!tripId || !body) {
      return NextResponse.json({ error: "Missing tripId or body" }, { status: 400 });
    }

    const trimmed = body.trim();
    // Skip too-short or too-long messages — not worth a model call
    if (trimmed.length < 12 || trimmed.length > 500) {
      return NextResponse.json({ actions: [] } satisfies DetectActionsResponse);
    }

    const cacheKey = `${tripId}::${user.id}::${trimmed}`;
    const cached = cacheGet(cacheKey);
    if (cached) return NextResponse.json({ actions: cached } satisfies DetectActionsResponse);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ actions: [] } satisfies DetectActionsResponse);
    }

    const client = new Anthropic({ apiKey });

    const prompt = `You are a chat-message intent classifier for a group travel planning app. The user just sent this message in a trip chat:

"${trimmed}"

Classify it into 0-2 actionable suggestions. Only emit an action if the message clearly proposes one of:
- itinerary: a specific plan / activity / meal / hotel to add to the trip
- expense: a payment that was made or needs to be split
- vote: a choice between 2+ options the group should decide on

Return strict JSON, no fences, matching exactly this shape:
{"actions":[{"kind":"itinerary","title":"…","type":"activity|meal|accommodation|transport","cost":<number|null>,"locationName":"…"|null}]}
or
{"actions":[{"kind":"expense","title":"…","amount":<number>,"category":"accommodation|transport|food|activity|shopping|other"}]}
or
{"actions":[{"kind":"vote","question":"…","options":["…","…"]}]}
or
{"actions":[]}

Rules:
- If the message is just chitchat / a question / a greeting, return {"actions":[]}.
- amount/cost in USD, no currency symbol.
- Keep title short (under 8 words).
- For votes, options must be 2-4 short labels extracted from the message.
- Never invent details that aren't in the message.`;

    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: '{"actions":' },
      ],
    });

    const raw = res.content[0]?.type === "text" ? res.content[0].text : "[]";
    let actions: DetectedAction[] = [];
    try {
      // Reattach the prefill prefix and balance the closing brace
      const text = '{"actions":' + raw.trim();
      const cleaned = text.endsWith("}") ? text : text + "}";
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.actions)) {
        actions = parsed.actions
          .filter((a: any) => a && typeof a === "object")
          .slice(0, 2);
      }
    } catch {
      actions = [];
    }

    cacheSet(cacheKey, actions);
    return NextResponse.json({ actions } satisfies DetectActionsResponse);
  } catch (err: any) {
    console.error("[ai/detect-actions] failed:", err?.message ?? err);
    // Soft-fail: never break the chat UX over a classifier hiccup
    return NextResponse.json({ actions: [] } satisfies DetectActionsResponse);
  }
}
