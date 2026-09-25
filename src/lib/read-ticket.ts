"use client";

import type { ParsedConfirmation } from "@/lib/confirmations/types";

/**
 * Turn a ticket file into what /api/ai/parse-confirmation reads, and read it.
 *
 * Photos are redrawn at most 1600px on the long edge. That is plenty for a
 * boarding pass or an e-ticket, and it matters: the host rejects request
 * bodies over 4.5 MB, and a full-resolution phone photo as base64 is often
 * larger than that — the read would fail with a bare 413.
 */
const MAX_EDGE = 1600;
const MAX_PDF_BYTES = 3 * 1024 * 1024;

type Body = { image: string; mediaType: string } | { pdf: string };

async function imageBody(file: File): Promise<Body | null> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const el = new Image();
      el.onload = () => ok(el);
      el.onerror = fail; // e.g. HEIC outside Safari
      el.src = src;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; // transparent PNG screenshots read badly on black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { image: canvas.toDataURL("image/jpeg", 0.85), mediaType: "image/jpeg" };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function pdfBody(file: File): Promise<Body | null> {
  if (file.size > MAX_PDF_BYTES) return null;
  const dataUrl = await new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = fail;
    r.readAsDataURL(file);
  });
  return { pdf: dataUrl.replace(/^data:[^;]+;base64,/, "") };
}

export type ReadResult =
  | { ok: true; flight: ParsedConfirmation }
  | { ok: false; reason: "unreadable" | "tooBig" | "noFlight" | "busy" };

/** Read the first flight on a ticket. Never throws. */
export async function readFlightFromFile(
  file: Blob & { name?: string; type: string },
  ctx: { tripStart: string; tripEnd: string },
): Promise<ReadResult> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name ?? "");
  const body = isPdf ? await pdfBody(file as File) : await imageBody(file as File);
  if (!body) return { ok: false, reason: isPdf ? "tooBig" : "unreadable" };

  try {
    const res = await fetch("/api/ai/parse-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        tripStart: ctx.tripStart,
        tripEnd: ctx.tripEnd,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    if (res.status === 429) return { ok: false, reason: "busy" };
    if (!res.ok) return { ok: false, reason: "unreadable" };
    const data = (await res.json()) as { items?: ParsedConfirmation[] };
    const flight = (data.items ?? []).find((i) => i.kind === "flight");
    return flight ? { ok: true, flight } : { ok: false, reason: "noFlight" };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
