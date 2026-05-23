"use client";

/**
 * Shared frame the three interactive demos live inside. Same outer
 * silhouette as the SVG screen cards we used to ship (rounded-2xl, thin
 * white border, vaguely phone-shaped), but the inside is real React.
 */

export function DemoFrame({
  children,
  toneClass = "from-indigo-500/[0.06] to-fuchsia-500/[0.04]",
}: {
  children: React.ReactNode;
  /** Tailwind gradient classes for the inside backdrop. */
  toneClass?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-black"
      style={{ aspectRatio: "9 / 16", maxWidth: 420, marginInline: "auto" }}
    >
      {/* Soft inner gradient — gives each demo a hint of color without
          drowning the UI. */}
      <div
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-br ${toneClass} pointer-events-none`}
      />
      {/* Inner safe-area container */}
      <div className="relative h-full flex flex-col">{children}</div>
    </div>
  );
}

/**
 * Top "status bar" of each demo — sets a fake trip name + members so the
 * frame feels like a real screen instead of a sandbox.
 */
export function DemoHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-5 pt-6 pb-3 border-b border-white/[0.06]">
      <p className="text-[10px] tracking-[0.18em] font-bold text-white/40 uppercase">
        {title}
      </p>
      <p className="text-sm font-semibold text-white mt-1">{subtitle}</p>
    </div>
  );
}
