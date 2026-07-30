"use client";

import dynamic from "next/dynamic";

// three.js must never run on the server — client-only dynamic import.
const VisionX = dynamic(
  () => import("@/components/landing/vision/vision-x").then((m) => m.VisionX),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#BFD9EC] flex items-center justify-center">
        <p className="text-[11px] font-black tracking-[0.3em] uppercase text-[#141414]/50">
          Boarding…
        </p>
      </div>
    ),
  },
);

export function VisionXClient() {
  return <VisionX />;
}
