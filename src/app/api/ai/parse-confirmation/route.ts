import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";
import { normalizeParsed, type ParseResponse } from "@/lib/confirmations/types";
import { extractPdfText } from "@/lib/pdf-text";

export const maxDuration = 45;

/**
 * "Add a confirmation" — extractor. POST one of:
 *   { image: base64, mediaType }   a screenshot / photo of the email
 *   { pdf: base64 }                the confirmation PDF (text extracted server-side)
 *   { text }                       pasted email body or a booking URL
 *   { hint }                       typed: "SV 826 6 Oct" / "Shinjuku Granbell 6-12 Oct"
 * plus { tripStart, tripEnd, tz } so dates without a year resolve inside the trip.
 *
 * Returns { items: ParsedConfirmation[] } — possibly several (a flight and the
 * hotel in the same email). Structured output via a forced tool call, same
 * pattern as /api/ai/plan; every field re-validated by normalizeParsed().
 * Never saves anything: the client shows a preview and the user confirms.
 */
const SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["flight", "hotel", "train", "other"] },
          title: { type: "string", description: "Flight number like 'SV 826', hotel name, train name, or a short label" },
          provider: { type: ["string", "null"] },
          confirmation: { type: ["string", "null"], description: "PNR / booking reference / confirmation code" },
          date: { type: ["string", "null"], description: "YYYY-MM-DD local departure or check-in date" },
          time: { type: ["string", "null"], description: "HH:mm 24h local departure or check-in time" },
          endDate: { type: ["string", "null"], description: "YYYY-MM-DD arrival or check-out date" },
          endTime: { type: ["string", "null"], description: "HH:mm arrival or check-out time" },
          from: { type: ["string", "null"], description: "origin IATA or city" },
          to: { type: ["string", "null"], description: "destination IATA or city" },
          address: { type: ["string", "null"] },
          notes: { type: ["string", "null"], description: "≤ 12 words: passengers, rooms, terminal, gate — only if present" },
          confidence: { type: "number" },
        },
        required: ["kind", "title", "confidence"],
      },
    },
    reason: { type: ["string", "null"], description: "If items is empty: one short sentence why" },
  },
  required: ["items"],
};

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { image?: string; mediaType?: string; pdf?: string; text?: string; hint?: string; tripStart?: string; tripEnd?: string; tz?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }

  const image = body.image?.replace(/^data:[\w/+.-]+;base64,/, "");
  let text = body.text?.trim().slice(0, 12_000);
  if (!text && body.pdf) {
    text = await extractPdfText(body.pdf);
    if (!text) return NextResponse.json({ items: [], reason: "Couldn't read text from that PDF — it may be a scan. Paste the details or type them." } satisfies ParseResponse, { status: 200 });
  }
  const hint = body.hint?.trim().slice(0, 200);
  if (!image && !text && !hint) return NextResponse.json({ error: "nothing to read" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ items: [], reason: "AI extraction is not configured" } satisfies ParseResponse, { status: 200 });

  const context = `Trip window: ${body.tripStart ?? "unknown"} → ${body.tripEnd ?? "unknown"}. Traveller timezone: ${body.tz ?? "unknown"}.
Rules: extract EVERY booking present (a flight AND the hotel in the same email are two items). Dates without a year belong inside the trip window. Times are LOCAL to the place they happen. Flight title = carrier code + number ("SV 826"). Hotel title = property name. If nothing is a booking, return items: [] with a reason. Never invent a code, date or time — use null.`;

  const anthropic = new Anthropic({ apiKey });
  const content: Anthropic.MessageParam["content"] = [];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: (body.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif") ?? "image/jpeg", data: image } });
  }
  content.push({ type: "text", text: `${context}\n\n${image ? "Read the booking(s) in this image." : text ? `Read the booking(s) in this text:\n\n${text}` : `The traveller typed this: "${hint}". Interpret it as a booking (flight number + date, or hotel name + dates).`}` });

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content }],
      tools: [{ name: "emit_confirmations", description: "Emit the bookings found.", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "emit_confirmations" },
    });
    const block = res.content.find((b) => b.type === "tool_use");
    const raw = block && block.type === "tool_use" ? (block.input as { items?: unknown[]; reason?: string }) : { items: [] };
    const items = (raw.items ?? []).map(normalizeParsed).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 6);
    return NextResponse.json({ items, reason: items.length ? undefined : raw.reason ?? "Couldn't find a booking in that" } satisfies ParseResponse);
  } catch (e) {
    console.error("[parse-confirmation]", e);
    return NextResponse.json({ items: [], reason: "Couldn't read that — try another photo or type it" } satisfies ParseResponse, { status: 200 });
  }
}
