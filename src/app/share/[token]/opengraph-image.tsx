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
 * - Soft-fails to a generic Flock card if the trip can't be found — never
 *   throws (a busted OG image shouldn't 500 a social bot).
 */

export const alt = "Trip planned with Flock";
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
  let title = "Trip with Flock";
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
        {/* Top — Flock brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            ✈
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Flock
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
            flock-pi-six.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
