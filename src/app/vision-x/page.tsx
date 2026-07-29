import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { VisionXClient } from "./vision-x-client";

export const metadata: Metadata = {
  title: "Paxawa — Vision concept D (flight mode)",
  robots: { index: false, follow: false },
};

// same Arabic face the app ships (root layout only attaches it when the
// app locale is ar, so this concept loads its own copy)
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic-x",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Design exploration route D — full 3D WebGL flight: scroll is the
 * throttle, a paper plane flies through a day-cycle sky, phase gates
 * mark the trip. Arabic-first with an EN toggle. Not linked; noindex.
 */
export default function VisionXPage() {
  return (
    <div className={plexArabic.variable}>
      <VisionXClient />
    </div>
  );
}
