"use client";

/**
 * A real screenshot of the live app inside a phone bezel. After three
 * rounds of hand-built minis drifting from the product ("the mockups are
 * not 100% similar to the app"), the landing now shows the actual thing:
 * captures from production (the same set the store listings use), EN and
 * AR, swapped with the page language.
 *
 * `progress` (0..1, the station movie) drives a gentle settle-in — the
 * screen slides up a touch and sharpens; no fake UI to animate.
 */
export function ShotPhone({
  src,
  video,
  alt,
  progress,
  className = "",
}: {
  src: string;
  /** Optional muted looping screen RECORDING of the live app; `src` stays
   *  the poster so nothing flashes while the video buffers. */
  video?: string;
  alt: string;
  progress?: number;
  className?: string;
}) {
  const p = progress === undefined ? 1 : Math.min(1, Math.max(0, progress / 0.35));
  const screenStyle = {
    opacity: 0.25 + p * 0.75,
    transform: `translateY(${(1 - p) * 14}px) scale(${1.03 - p * 0.03})`,
    transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)",
  } as const;
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border-[5px] border-[#141414] bg-[#0D0D0D] ${className}`}
      style={{ aspectRatio: "1320 / 2868" }}
    >
      {video ? (
        <video
          src={video}
          poster={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt}
          className="absolute inset-0 w-full h-full object-cover"
          style={screenStyle}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={screenStyle}
        />
      )}
      {/* thin screen glass edge */}
      <div aria-hidden className="absolute inset-0 rounded-[23px] pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }} />
    </div>
  );
}
