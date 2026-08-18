import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips, tripMembers, itineraryItems, bookings, documents } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { parseInboundAddress, verifyInbound } from "@/lib/inbound/address";
import { normalizeParsed, type ParsedConfirmation } from "@/lib/confirmations/types";
import { extractPdfText } from "@/lib/pdf-text";
import Anthropic from "@anthropic-ai/sdk";
import { createHmac, timingSafeEqual } from "node:crypto";

export const maxDuration = 60;

/**
 * Forward-the-email endpoint. Resend Inbound (or any provider posting the
 * same shape) POSTs the parsed email here:
 *
 *   { to: string[] | string, from, subject, text?, html?, attachments?: [{ filename, content_type, content(base64) }] }
 *
 * Auth: HMAC-SHA256 of the raw body with INBOUND_WEBHOOK_SECRET in header
 * `x-paxawa-signature` (Resend's Svix signature can be mapped to this by a
 * transform, or set the same shared secret on both sides). Then the address
 * itself must verify (see lib/inbound/address).
 *
 * What it does: extracts bookings from the text (or the first PDF), and
 * writes them exactly like the in-app sheet — anchor stops + bookings rows —
 * attributed to the trip OWNER (there is no signed-in user), plus a
 * documents row pointing at the sender/subject (the attachment itself is not
 * stored here; storage needs a user session — the crew opens the original
 * from their inbox). Never invents: nothing found → 200 with {saved: 0}.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "inbound not configured" }, { status: 503 });
  const sig = req.headers.get("x-paxawa-signature") ?? "";
  const expect = createHmac("sha256", secret).update(raw).digest("hex");
  let ok = false;
  try { ok = timingSafeEqual(Buffer.from(expect), Buffer.from(sig)); } catch { ok = false; }
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let body: { to?: string[] | string; from?: string; subject?: string; text?: string; html?: string; attachments?: { filename?: string; content_type?: string; content?: string }[] };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const tos = Array.isArray(body.to) ? body.to : body.to ? [body.to] : [];
  const parsedAddr = tos.map(parseInboundAddress).find(Boolean);
  if (!parsedAddr) return NextResponse.json({ error: "no trip address" }, { status: 404 });

  const [trip] = await db
    .select({ id: trips.id, startDate: trips.startDate, endDate: trips.endDate, createdBy: trips.createdBy })
    .from(trips)
    .where(sql`replace(${trips.id}::text, '-', '') like ${parsedAddr.short + "%"}`)
    .limit(1);
  if (!trip || !verifyInbound(trip.id, parsedAddr.mac)) return NextResponse.json({ error: "unknown trip" }, { status: 404 });
  const owner = await db.query.tripMembers.findFirst({ where: and(eq(tripMembers.tripId, trip.id), eq(tripMembers.role, "owner")) });
  const actor = owner?.userId ?? trip.createdBy;

  // Text to read: body text, else html stripped, else the first PDF.
  let text = (body.text ?? "").trim();
  if (!text && body.html) text = body.html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) {
    const pdf = body.attachments?.find((a) => (a.content_type ?? "").includes("pdf") && a.content);
    if (pdf?.content) text = await extractPdfText(pdf.content);
  }
  if (body.subject) text = `Subject: ${body.subject}\n\n${text}`;
  text = text.slice(0, 12_000);
  if (text.length < 20) return NextResponse.json({ saved: 0, reason: "nothing to read" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ saved: 0, reason: "AI extraction not configured" });
  const anthropic = new Anthropic({ apiKey });
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1200,
    messages: [{ role: "user", content: `Trip window: ${trip.startDate} → ${trip.endDate}. Extract EVERY booking in this forwarded email (a flight AND a hotel are two items). Dates without a year belong inside the trip window. Times are LOCAL. Flight title = carrier code + number. Never invent a code, date or time — use null.\n\n${text}` }],
    tools: [{ name: "emit_confirmations", description: "Emit the bookings found.", input_schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { kind: { type: "string", enum: ["flight", "hotel", "train", "other"] }, title: { type: "string" }, provider: { type: ["string", "null"] }, confirmation: { type: ["string", "null"] }, date: { type: ["string", "null"] }, time: { type: ["string", "null"] }, endDate: { type: ["string", "null"] }, endTime: { type: ["string", "null"] }, from: { type: ["string", "null"] }, to: { type: ["string", "null"] }, address: { type: ["string", "null"] }, notes: { type: ["string", "null"] }, confidence: { type: "number" } }, required: ["kind", "title", "confidence"] } } }, required: ["items"] } }],
    tool_choice: { type: "tool", name: "emit_confirmations" },
  }).catch(() => null);
  const block = res?.content.find((b) => b.type === "tool_use");
  const items = (block && block.type === "tool_use" ? ((block.input as { items?: unknown[] }).items ?? []) : [])
    .map(normalizeParsed).filter((x): x is ParsedConfirmation => !!x && x.confidence >= 0.6).slice(0, 6);
  if (!items.length) return NextResponse.json({ saved: 0, reason: "no booking found" });

  const clamp = (d: string | null) => (!d ? trip.startDate : d < trip.startDate ? trip.startDate : d > trip.endDate ? trip.endDate : d);
  const stopIds: string[] = [];
  for (const it of items) {
    const type = it.kind === "flight" ? "flight" : it.kind === "hotel" ? "stay" : "other";
    const stopType = type === "flight" ? "booking_flight" : type === "stay" ? "booking_stay" : "booking_other";
    const itemType = type === "flight" ? "transport" : type === "stay" ? "accommodation" : "other";
    const name = it.from && it.to && it.kind !== "hotel" ? `${it.title} · ${it.from} → ${it.to}` : it.title;
    const [stop] = await db.insert(itineraryItems).values({
      tripId: trip.id, dayDate: clamp(it.date), title: it.provider ? `${it.provider} — ${name}` : name, type: itemType,
      startTime: it.time, status: "confirmed", stopType, sortOrder: -1, createdBy: actor, provider: "manual",
    }).returning({ id: itineraryItems.id });
    const nights = it.kind === "hotel" && it.date && it.endDate ? Math.round((Date.parse(it.endDate) - Date.parse(it.date)) / 86_400_000) : null;
    await db.insert(bookings).values({ stopId: stop.id, bookingType: type, providerName: it.provider, confirmationNumber: it.confirmation, nights: nights && nights > 0 ? nights : null, createdBy: actor });
    stopIds.push(stop.id);
  }
  // A docs row so the crew sees "it came in by email" (link = mailto sender).
  await db.insert(documents).values({
    tripId: trip.id, type: items[0].kind === "flight" ? "flight" : items[0].kind === "hotel" ? "hotel" : "other",
    url: body.from ? `mailto:${body.from}` : "mailto:", title: body.subject?.slice(0, 120) || items[0].title, dayDate: clamp(items[0].date), uploadedBy: actor,
    description: "forwarded email",
  }).catch(() => {});
  return NextResponse.json({ saved: items.length, stopIds });
}
