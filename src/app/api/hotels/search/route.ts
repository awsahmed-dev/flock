import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";

export interface HotelResult {
  hotelId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number; // 0-4
  photoUrl?: string;
  mapsUrl?: string;
  bookingUrl?: string;
  lat?: number;
  lng?: number;
}

export type StayType = "hotel" | "hostel" | "apartment" | "resort" | "b&b";

const QUERY_MAP: Record<StayType, string> = {
  hotel: "hotels",
  hostel: "hostels",
  apartment: "apartments",
  resort: "resorts",
  "b&b": "bed and breakfast",
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination");
  const stayType = (searchParams.get("type") ?? "hotel") as StayType;
  const minPrice = parseInt(searchParams.get("minPrice") ?? "0"); // 0-4
  const maxPrice = parseInt(searchParams.get("maxPrice") ?? "4"); // 0-4
  const minRating = parseFloat(searchParams.get("minRating") ?? "0");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 30);

  if (!destination) {
    return NextResponse.json({ error: "Missing destination" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Hotel search is not configured. Add GOOGLE_MAPS_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const queryWord = QUERY_MAP[stayType] ?? "hotels";
    const query = encodeURIComponent(`${queryWord} in ${destination}`);

    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${query}&type=lodging&key=${apiKey}` +
      (minPrice > 0 ? `&minprice=${minPrice}` : "") +
      (maxPrice < 4 ? `&maxprice=${maxPrice}` : "");

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Places API error: ${res.status}`);

    const data = await res.json();

    if (data.status === "REQUEST_DENIED") {
      return NextResponse.json(
        { error: "Google Maps API key is invalid or Places API is not enabled." },
        { status: 503 }
      );
    }

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({ hotels: [] });
    }

    if (data.status !== "OK") {
      return NextResponse.json({ hotels: [], warning: data.status });
    }

    let results: HotelResult[] = (data.results ?? []).map((place: any) => {
      let photoUrl: string | undefined;
      if (place.photos?.[0]?.photo_reference) {
        photoUrl =
          `https://maps.googleapis.com/maps/api/place/photo` +
          `?maxwidth=600&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`;
      }

      return {
        hotelId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        priceLevel: place.price_level,
        photoUrl,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        bookingUrl: `https://www.booking.com/search.html?ss=${encodeURIComponent(place.name + " " + destination)}`,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      } as HotelResult;
    });

    // Filter by rating
    if (minRating > 0) {
      results = results.filter((h) => (h.rating ?? 0) >= minRating);
    }

    // Limit
    results = results.slice(0, limit);

    return NextResponse.json({ hotels: results });
  } catch (error) {
    console.error("Hotel search error:", error);
    return NextResponse.json({ error: "Search failed", hotels: [] }, { status: 200 });
  }
}
