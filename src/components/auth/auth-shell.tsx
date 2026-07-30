import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { MARKETING_LIGHT_VARS, MARKETING_SKY } from "@/components/landing/marketing-light";

/**
 * Flight-mode chrome for the auth pages: the concept-D sky with a faint
 * runway grid, a floating pill header, and the sign-in card framed as a
 * boarding pass (NOW BOARDING strip above, barcode + gate line below).
 * Light-only — MARKETING_LIGHT_VARS forces the shadcn form card light
 * even when the app theme is dark. Forms themselves are untouched.
 */
export function AuthShell({
  subtitle,
  boarding,
  children,
}: {
  /** line under the logo, e.g. "Welcome back · أهلًا بعودتك" */
  subtitle: string;
  /** boarding-strip label, e.g. "Now boarding · الصعود" */
  boarding: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center px-4 py-24 overflow-hidden"
      style={{ ...MARKETING_LIGHT_VARS, background: MARKETING_SKY }}
    >
      {/* runway grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#141414 1px, transparent 1px), linear-gradient(90deg, #141414 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* soft clouds */}
      <div aria-hidden className="absolute -top-24 -start-32 w-[34rem] h-[16rem] rounded-full bg-white/60 blur-[70px] pointer-events-none" />
      <div aria-hidden className="absolute bottom-10 -end-40 w-[38rem] h-[18rem] rounded-full bg-white/50 blur-[80px] pointer-events-none" />

      {/* pill header */}
      <header className="fixed top-5 inset-x-0 z-40 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full px-5 py-2.5 backdrop-blur-md shadow-lg bg-white/85 text-[#141414]">
          <Link href="/" aria-label="Paxawa home" className="flex items-center">
            <Logo variant="full" size="xs" />
          </Link>
          <span className="w-px h-4 bg-[#141414]/15" aria-hidden />
          <span className="text-[11px] font-bold text-[#141414]/55">نروح سوا</span>
        </div>
      </header>

      <div className="relative w-full max-w-sm">
        {/* boarding strip */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <span className="block h-px flex-1 bg-[#141414]/15" aria-hidden />
          <span
            className="rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.14em] uppercase"
            style={{ color: "#0C7A6F", borderColor: "rgba(12,122,111,0.4)", background: "rgba(255,255,255,0.55)" }}
          >
            {boarding}
          </span>
          <span className="block h-px flex-1 bg-[#141414]/15" aria-hidden />
        </div>

        <div className="flex flex-col items-center gap-2 mb-7">
          <Link href="/" className="flex items-center text-[#141414]" aria-label="Paxawa home">
            <Logo variant="full" size="md" />
          </Link>
          <p className="text-sm font-medium text-[#141414]/55">{subtitle}</p>
        </div>

        {children}

        {/* boarding-pass tail: barcode + gate line */}
        <div className="mt-7 flex flex-col items-center gap-2" aria-hidden>
          <div
            className="h-7 w-44 rounded-[3px] opacity-70"
            style={{
              background:
                "repeating-linear-gradient(90deg, #141414 0 2px, transparent 2px 4px, #141414 4px 7px, transparent 7px 9px, #141414 9px 10px, transparent 10px 14px)",
            }}
          />
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#141414]/40">
            Gate SAWA · On time · PAX 04
          </p>
        </div>
      </div>

      {/* ground-crew footer */}
      <footer className="absolute bottom-5 inset-x-0 flex justify-center gap-5 text-[11px] font-medium text-[#141414]/45">
        <Link href="/terms" className="hover:text-[#141414] transition-colors">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-[#141414] transition-colors">
          Privacy
        </Link>
        <span>© {new Date().getFullYear()} Paxawa</span>
      </footer>
    </div>
  );
}
