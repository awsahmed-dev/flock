"use client";

/**
 * Local-only preview: each station MOCKUP next to the production
 * screenshot it mirrors — the fidelity check. Not linked from anywhere;
 * dev route like /dev/inspire-lab.
 */

import { DiscoverDemo } from "@/components/landing/demos/discover-demo";
import { DepartureDemo } from "@/components/landing/demos/departure-demo";
import { ExpenseDemo } from "@/components/landing/demos/expense-demo";
import { WrapDemo } from "@/components/landing/demos/wrap-demo";

const PAIRS = [
  { label: "PLAN — Discover", shot: "discover", Demo: DiscoverDemo },
  { label: "PACK — Cockpit", shot: "cockpit", Demo: DepartureDemo },
  { label: "SPLIT — Money", shot: "money", Demo: ExpenseDemo },
  { label: "WRAP — Recap", shot: "recap", Demo: WrapDemo },
] as const;

export default function LandingDemosPreview() {
  return (
    <div className="min-h-screen bg-[#1e2530] p-8 flex flex-col gap-10">
      {PAIRS.map(({ label, shot, Demo }) => (
        <div key={shot}>
          <p className="text-white/60 text-sm mb-3 font-semibold uppercase">{label} · mockup vs live screenshot</p>
          <div className="flex gap-6 items-start">
            <div style={{ height: 580, aspectRatio: "1320 / 2868" }}>
              <Demo progress={1} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/landing/screens/en/${shot}.jpg`}
              alt={label}
              className="rounded-[24px] border-4 border-[#141414]"
              style={{ height: 580, aspectRatio: "1320 / 2868", objectFit: "cover", background: "#0D0D0D" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
