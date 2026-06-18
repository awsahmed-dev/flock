import { NextResponse } from "next/server";
import { photoMediaUrl } from "@/lib/places/google";
import { requireUser, placesError } from "../_helpers";

/**
 * Photo proxy. The client never sees a Google photo URL or the API key — it
 * requests /api/discover/photo?ref=<photoResourceName>&w=800 and we stream the
 * bytes back. Cached short-term at the CDN edge (Cache-Control) per Google's
 * caching policy — never permanently rehosted.
 */
export async function GET(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  const w = Math.min(Number(searchParams.get("w") ?? 800) || 800, 1600);

  try {
    const upstream = await fetch(photoMediaUrl(ref, w), { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
        // Edge-cache for a day; well within Google's short-cache policy.
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    return placesError(err);
  }
}
