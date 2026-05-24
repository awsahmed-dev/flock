import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Dynamic Open Graph image for /share/[token] links.
 *
 * Generated per share-token, so when someone drops the link into Twitter,
 * WhatsApp, iMessage, Slack, etc, they see a 1200×630 card with the trip's
 * destination, dates, and brand — not a generic Vercel placeholder.
 *
 * Implementation notes:
 * - Uses next/og's ImageResponse (Vercel @vercel/og under the hood). No
 *   custom font loading — the default OS font is enough, and avoiding the
 *   font fetch keeps cold starts fast.
 * - Cache headers come for free from next/og; the image regenerates if the
 *   route is invalidated (e.g. when trip name/dates change).
 * - Soft-fails to a generic Paxawa card if the trip can't be found — never
 *   throws (a busted OG image shouldn't 500 a social bot).
 */

export const alt = "Trip planned with Paxawa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: { token: string };
}

function fmtDate(iso: string): string {
  // Avoid Intl in edge runtime — keep it deterministic and tiny.
  const d = new Date(iso);
  const month = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][d.getUTCMonth()];
  return `${month} ${d.getUTCDate()}`;
}

export default async function OgImage({ params }: Props) {
  let title = "Trip with Paxawa";
  let destination = "Somewhere amazing";
  let dateRange = "";

  try {
    const trip = await db.query.trips.findFirst({
      where: eq(trips.shareToken, params.token),
    });
    if (trip) {
      title = trip.name;
      destination = trip.destination;
      dateRange = `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`;
    }
  } catch {
    // soft-fail to generic card
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 90px",
          color: "white",
          background:
            "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top — Paxawa lockup. Mark + wordmark inlined as SVG so the
            OG renderer can rasterize them at any size (no external fetch). */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg
            width="62"
            height="50"
            viewBox="0 0 254 205"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M191.66 8.82001C125.91 -20.81 0 21.66 0.16 175.31L0 203.01C0 203.43 0.33 203.77 0.75 203.77C0.75 203.77 59.94 205.34 79.65 204.69C95.73 204.16 143.79 199.68 143.79 199.68L143.75 199.66C143.75 199.66 139.12 157.9 138.01 150.63C137.93 150.11 137.36 149.83 136.9 150.09L94.16 173.5C93.94 173.62 93.67 173.62 93.45 173.5L60.71 156.48C60.17 156.2 60.17 155.42 60.71 155.14L132.34 117.26C132.62 117.11 132.78 116.81 132.74 116.5L123.02 38.3C122.95 37.7 123.57 37.26 124.11 37.53C130.35 40.65 157.96 55.98 161.4 57.89C161.62 58.01 161.76 58.24 161.78 58.49L165.24 102.3C165.28 102.85 165.89 103.17 166.37 102.9L204.7 80.96C204.92 80.83 205.19 80.83 205.41 80.94L239.66 97.96C240.22 98.24 240.22 99.03 239.67 99.31L171.88 134.3C171.6 134.45 171.44 134.75 171.48 135.07L178.69 190.58C178.75 191.03 179.18 191.32 179.62 191.22L182.92 190.44C182.92 190.44 182.96 190.43 182.98 190.42C255.28 173 292 54.03 191.7 8.82001H191.66Z"
              fill="white"
            />
          </svg>
          <span
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Paxawa
          </span>
        </div>

        {/* Middle — trip headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255, 255, 255, 0.65)",
              letterSpacing: "-0.01em",
              display: "flex",
            }}
          >
            📍 {destination}
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.05,
              display: "flex",
            }}
          >
            {title.slice(0, 60)}
            {title.length > 60 ? "…" : ""}
          </div>
          {dateRange && (
            <div
              style={{
                fontSize: 32,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              {dateRange}
            </div>
          )}
        </div>

        {/* Bottom — call to action */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: "rgba(255, 255, 255, 0.55)",
              display: "flex",
            }}
          >
            Plan group trips together
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.85)",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 999,
              padding: "10px 22px",
              display: "flex",
            }}
          >
            paxawa.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
