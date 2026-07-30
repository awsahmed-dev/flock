import { SkyShell, GateChip } from "@/components/landing/sky-shell";

/**
 * Shared chrome for /terms and /privacy, in the flight-mode world: the
 * giant glass word behind the sky, a gate-announcement title, and the
 * legal text on a white paper card drifting over the runway grid.
 * Server-rendered, no client JS — legal pages stay boring-fast.
 */
export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <SkyShell word="RULES">
      <main className="px-6">
        <div className="max-w-3xl mx-auto pt-36 pb-10">
          <div style={{ animation: "vx-in 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
            <GateChip hue="#5B4BD9">Ground control · قواعد الرحلة</GateChip>
          </div>
          <h1
            className="mt-5 font-black tracking-[-0.025em] leading-[1.05]"
            style={{ fontSize: "clamp(36px, 6vw, 64px)", animation: "vx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.06s both" }}
          >
            {title}
          </h1>
          <p
            className="mt-4 text-[11px] font-black tracking-[0.14em] uppercase text-[#141414]/45"
            style={{ animation: "vx-in 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}
          >
            Last updated · {lastUpdated}
          </p>
        </div>

        {/* the document — a paper card on the sky */}
        <div
          className="max-w-3xl mx-auto"
          style={{ animation: "vx-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.14s both" }}
        >
          <div className="bg-white rounded-[28px] border border-black/[0.08] shadow-[0_36px_90px_-44px_rgba(10,14,24,0.35)] px-6 py-10 sm:px-12 sm:py-14">
            <div className="text-[#141414]/75 leading-relaxed [&_h2]:text-xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-[#141414] [&_h2]:mt-10 [&_h2]:mb-3 first:[&_h2]:mt-0 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:mt-3 [&_ul]:space-y-1.5 [&_a]:text-[#5B4BD9] [&_a]:font-semibold hover:[&_a]:underline [&_strong]:text-[#141414] [&_strong]:font-semibold">
              {children}
            </div>
          </div>
        </div>
      </main>
    </SkyShell>
  );
}
