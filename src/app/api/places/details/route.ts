import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getPlaceDetails } from "@/lib/foursquare";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fsqId = searchParams.get("id")?.trim();
  if (!fsqId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const details = await getPlaceDetails(fsqId);
    return NextResponse.json(details);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Foursquare error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
