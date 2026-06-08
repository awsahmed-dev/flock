/**
 * B19: Unsplash hero image fetcher for trips. We hit /search/photos once
 * per trip (when the destination is first persisted) and cache the
 * result on the trips row — no per-view API hits.
 *
 * Requires NEXT_PUBLIC_UNSPLASH_ACCESS_KEY (the public "demo" key works
 * fine for our scale — 50 req/h is plenty since we hit it once per trip
 * lifetime). Falls back gracefully to null if the key is missing or the
 * search returns no results, so the rest of the app keeps working with
 * the existing gradient placeholder.
 *
 * Unsplash API rules require:
 *   1. Photographer attribution (name + profile link)
 *   2. Tracking download events when the image is "used"
 * We satisfy (1) by storing credit_name + credit_link on the trip row
 * and rendering them in the corner of every hero image. (2) is satisfied
 * by hitting the photo's `download_location` endpoint once at fetch time.
 */

export interface UnsplashHero {
  url: string;
  creditName: string;
  creditLink: string;
}

interface UnsplashSearchResponse {
  results: Array<{
    id: string;
    urls: { regular: string; full: string };
    links: { download_location: string };
    user: { name: string; username: string };
  }>;
}

const SEARCH_ENDPOINT = "https://api.unsplash.com/search/photos";

export async function getDestinationHero(
  destination: string,
): Promise<UnsplashHero | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;
  if (!destination.trim()) return null;

  // Take only the first city segment for the search to maximise hit
  // quality — "Kuala Lumpur, Malaysia" → "Kuala Lumpur"; if the model
  // emits "Tokyo, Osaka, Kyoto" we get a Tokyo photo, which still feels
  // representative.
  const query = destination.split(",")[0].trim();

  const params = new URLSearchParams({
    query,
    orientation: "landscape",
    per_page: "1",
    content_filter: "high",
  });

  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      // Cache aggressively — we only want one fetch per destination
      // string for our entire user base, and the cached row in the DB
      // is the long-term store.
      next: { revalidate: 86_400, tags: ["unsplash"] },
    });
    if (!res.ok) return null;
    const data: UnsplashSearchResponse = await res.json();
    const photo = data.results?.[0];
    if (!photo) return null;

    // Fire-and-forget the download tracking ping. Required by Unsplash
    // ToS but doesn't need to succeed for us to use the photo.
    fetch(photo.links.download_location, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }).catch(() => {});

    return {
      url: photo.urls.regular,
      creditName: photo.user.name,
      // Include utm so Unsplash sees Paxawa as the referrer in their
      // analytics — also required by their attribution rules.
      creditLink: `https://unsplash.com/@${photo.user.username}?utm_source=paxawa&utm_medium=referral`,
    };
  } catch {
    return null;
  }
}
