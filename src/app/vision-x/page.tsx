import type { Metadata } from "next";
import { VisionXClient } from "./vision-x-client";

export const metadata: Metadata = {
  title: "Paxawa — Vision concept D (flight mode)",
  robots: { index: false, follow: false },
};

/**
 * Design exploration route D — full 3D WebGL flight: scroll is the
 * throttle, a paper plane flies through a day-cycle sky, phase gates
 * mark the trip. Not linked from anywhere; noindex.
 */
export default function VisionXPage() {
  return <VisionXClient />;
}
