import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth/get-user";

export const maxDuration = 30;

/**
 * Phase 6 §8-B — receipt OCR. POST { image: base64 (jpeg/png/webp) } →
 * { amount, currency, merchant, confidence } via Claude Haiku vision.
 * Returns null fields on anything ambiguous — the client falls back to
 * manual entry rather than guessing at money.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ amount: null }, { status: 200 });

  let body: { image?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const image = body.image?.replace(/^data:image\/\w+;base64,/, "");
  if (!image) return NextResponse.json({ error: "no image" }, { status: 400 });

  const anthropic = new Anthropic({ apiKey });
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: (body.mediaType as "image/jpeg" | "image/png" | "image/webp") ?? "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: `Read this receipt/bill. Respond with JSON only, no prose:
{"amount": <total as number, null if unreadable>, "currency": "<3-letter ISO code, null if unclear>", "merchant": "<business name, null if unclear>", "confidence": <0-1>}`,
            },
          ],
        },
      ],
    });
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ amount: null });
    const parsed = JSON.parse(match[0]);
    return NextResponse.json({
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      currency: typeof parsed.currency === "string" ? parsed.currency.toUpperCase().slice(0, 3) : null,
      merchant: typeof parsed.merchant === "string" ? parsed.merchant : null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    });
  } catch {
    return NextResponse.json({ amount: null });
  }
}
