"use client";

/**
 * Pure-CSS device-frame mockups. No images, just rounded divs + soft shadow
 * + an inner content slot. Use these to wrap a screenshot SVG (or PNG once
 * the user drops real screenshots into /public/screens/).
 *
 * Why CSS not images: device PNGs lock you into one color scheme and look
 * dated within a year. These auto-respect the theme and scale crisply.
 */

import { motion, type MotionProps } from "motion/react";

interface PhoneFrameProps {
  src: string;
  alt: string;
  /** Optional scale (1 = default 280×580 logical size). */
  scale?: number;
  /** Optional motion props to animate the whole frame. */
  motionProps?: MotionProps;
  className?: string;
}

/**
 * iPhone-15-Pro-ish frame. Notch is a thin pill; titanium ring is a
 * subtle gradient on the bezel.
 */
export function PhoneFrame({
  src,
  alt,
  scale = 1,
  motionProps,
  className,
}: PhoneFrameProps) {
  return (
    <motion.div
      {...motionProps}
      className={className}
      style={{
        width: 280 * scale,
        height: 580 * scale,
        ...((motionProps?.style as object | undefined) ?? {}),
      }}
    >
      <div
        className="relative w-full h-full rounded-[44px] p-[10px] bg-gradient-to-br from-slate-700 via-slate-900 to-slate-800 shadow-2xl shadow-indigo-900/40"
        style={{
          boxShadow:
            "0 30px 60px -15px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
      >
        {/* Screen */}
        <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[90px] h-[24px] rounded-full bg-black z-10 flex items-center justify-end pr-2 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="w-2 h-2 rounded-full bg-slate-800 ring-1 ring-slate-700" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * MacBook-ish frame for desktop screenshots. Optional for now — used
 * in the hero collage to balance the phone.
 */
export function LaptopFrame({
  src,
  alt,
  className,
  motionProps,
}: {
  src: string;
  alt: string;
  className?: string;
  motionProps?: MotionProps;
}) {
  return (
    <motion.div {...motionProps} className={className}>
      <div className="relative">
        {/* Screen bezel */}
        <div
          className="rounded-[14px] p-[8px] bg-gradient-to-br from-slate-700 to-slate-900"
          style={{
            boxShadow:
              "0 30px 50px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset",
          }}
        >
          <div className="rounded-[8px] overflow-hidden bg-black aspect-[16/10]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </div>
        {/* Base / hinge */}
        <div className="relative -mt-[2px]">
          <div className="h-[10px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-[3px]" />
          <div className="mx-auto w-[110px] h-[6px] bg-slate-800 rounded-b-[8px]" />
        </div>
      </div>
    </motion.div>
  );
}
