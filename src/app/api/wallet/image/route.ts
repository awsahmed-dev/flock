import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getDestinationHero } from "@/lib/unsplash";

export const dynamic = "force-dynamic";

/**
 * B20: thin proxy used by the Wallet detail sheet to fetch an Unsplash
 * photo for a hotel or activity card. Auth-gated (so anonymous callers
 * can't burn our demo rate limit). Returns null gracefully on miss.
 *
 * Once we have real bookings the photo will be persisted on the booking
 * row at parse time; until then this route powers the mock detail
 * sheets with lazy-loaded imagery.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }
  const photo = await getDestinationHero(q);
  return NextResponse.json(photo, {
    headers: {
      // Cache for a day per query — same data behind the hero photos on
      // trip overview. Reduces repeat Unsplash hits in a session.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
