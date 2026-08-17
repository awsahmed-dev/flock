import { describe, it, expect } from "vitest";
import { normalizeParsed } from "@/lib/confirmations/types";

describe("normalizeParsed — the extractor's output is never trusted raw", () => {
  it("keeps a well-formed flight", () => {
    const p = normalizeParsed({ kind: "flight", title: "SV 826", provider: "Saudia", confirmation: "7XK9QP", date: "2026-10-06", time: "09:15", from: "RUH", to: "NRT", confidence: 0.9 });
    expect(p).toMatchObject({ kind: "flight", title: "SV 826", date: "2026-10-06", time: "09:15", from: "RUH", to: "NRT", confidence: 0.9 });
  });
  it("drops malformed dates/times instead of saving garbage", () => {
    const p = normalizeParsed({ kind: "hotel", title: "Granbell", date: "6 Oct", time: "3pm", endDate: "2026-10-12", confidence: 2 });
    expect(p?.date).toBeNull(); expect(p?.time).toBeNull(); expect(p?.endDate).toBe("2026-10-12"); expect(p?.confidence).toBe(1);
  });
  it("unknown kind → other; no title → null; strings are trimmed and capped", () => {
    expect(normalizeParsed({ kind: "boat", title: "  Ferry  ", confidence: 0.5 })).toMatchObject({ kind: "other", title: "Ferry" });
    expect(normalizeParsed({ kind: "flight", confidence: 0.5 })).toBeNull();
    expect(normalizeParsed({ kind: "flight", title: "x".repeat(500), confidence: 0.5 })!.title.length).toBe(120);
    expect(normalizeParsed(null)).toBeNull();
  });
});
