import type { Metadata } from "next";
import { VisionLanding } from "@/components/landing/vision/vision-landing";

export const metadata: Metadata = {
  title: "Paxawa — Vision concept",
  robots: { index: false, follow: false },
};

/**
 * Design exploration route — an alternative landing concept ("the page
 * performs the phase engine"). Not linked from anywhere; noindex. Kept
 * separate from `/` so both designs can be compared live.
 */
export default function VisionPage() {
  return <VisionLanding />;
}
