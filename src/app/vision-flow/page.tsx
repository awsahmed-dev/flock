import type { Metadata } from "next";
import { VisionFlowLanding } from "@/components/landing/vision/vision-flow-landing";

export const metadata: Metadata = {
  title: "Paxawa — Vision concept C (autoplay)",
  robots: { index: false, follow: false },
};

/**
 * Design exploration route C — same journey as /vision but the chapter
 * mockups autoplay on entry instead of scroll-scrubbing; normal page
 * height, skimmable fast. Not linked from anywhere; noindex.
 */
export default function VisionFlowPage() {
  return <VisionFlowLanding />;
}
