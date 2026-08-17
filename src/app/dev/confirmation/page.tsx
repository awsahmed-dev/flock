"use client";

/**
 * DEV PREVIEW — Add-a-confirmation sheet with the extractor mocked
 * (ANTHROPIC key is empty locally). Not linked; 404 in production.
 * ?step=preview jumps straight to the read-back with two items.
 */
import { useEffect, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { AddConfirmationSheet } from "@/components/confirmations/add-confirmation-sheet";

const MOCK = {
  items: [
    { kind: "flight", title: "SV 826", provider: "Saudia", confirmation: "7XK9QP", date: "2026-10-06", time: "09:15", endDate: "2026-10-06", endTime: "15:00", from: "RUH", to: "NRT", address: null, notes: "4 passengers · T1 · gate opens 08:15", confidence: 0.92 },
    { kind: "hotel", title: "Shinjuku Granbell Hotel", provider: null, confirmation: "HB-22910", date: "2026-10-06", time: "15:00", endDate: "2026-10-12", endTime: "11:00", from: null, to: null, address: "2-14-5 Kabukicho, Shinjuku", notes: "2 rooms", confidence: 0.86 },
  ],
};

export default function DevConfirmationPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/ai/parse-confirmation")) {
        await new Promise((r) => setTimeout(r, 700));
        return new Response(JSON.stringify(MOCK), { headers: { "content-type": "application/json" } });
      }
      return orig(input, init);
    };
    return () => { window.fetch = orig; };
  }, []);
  useEffect(() => {
    if (sp.get("step") === "preview") {
      // drive the sheet: choose "Type it", fill, read
      const t = setTimeout(() => {
        const typeBtn = [...document.querySelectorAll("button")].find((b) => /Type it|اكتبها/.test(b.textContent ?? ""));
        typeBtn?.click();
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder]');
          if (input) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(input, "SV 826 6 Oct + Granbell"); input.dispatchEvent(new Event("input", { bubbles: true })); }
          setTimeout(() => { [...document.querySelectorAll("button")].find((b) => /Read it|اقرأها/.test(b.textContent ?? ""))?.click(); }, 150);
        }, 200);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [sp]);
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4"><span className="rounded-md bg-amber-400 text-black text-[11px] font-black px-2 py-0.5">DEV PREVIEW</span> <button className="ms-3 underline text-sm" onClick={() => setOpen(true)}>open sheet</button></div>
      <AddConfirmationSheet open={open} onClose={() => setOpen(false)} tripId="00000000-0000-0000-0000-00000000f001" tripStart="2026-10-06" tripEnd="2026-10-12" />
    </div>
  );
}
