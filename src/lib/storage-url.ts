/**
 * Private-bucket URLs.
 *
 * The trip-documents and chat-media buckets are PRIVATE (authz-3). Files are
 * served through /api/storage/<bucket>/<path>, which authenticates the caller
 * and checks trip membership from the object path before streaming the bytes.
 * The proxy URL is stable, so the offline IndexedDB doc cache (lib/doc-file)
 * and <img>/<a>/<iframe> consumers keep working unchanged — only the string
 * stored in the DB changes shape.
 *
 * Old rows still hold the pre-privatisation public URL
 * (https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>);
 * `toProtectedUrl` maps either form to the proxy so consumers never care.
 * Client-safe: no server imports.
 */
export const PRIVATE_BUCKETS = ["trip-documents", "chat-media"] as const;
export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

const OBJECT_RE = /\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?#]+)\/([^?#]+)/;

/** Parse a Supabase storage URL into bucket + object path, or null. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = OBJECT_RE.exec(url);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

export function isPrivateBucket(bucket: string): bucket is PrivateBucket {
  return (PRIVATE_BUCKETS as readonly string[]).includes(bucket);
}

/** Same-origin proxy URL for an object in a private bucket. */
export function protectedFileUrl(bucket: PrivateBucket, path: string): string {
  return `/api/storage/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Map any stored file URL to what the browser should load:
 *  - already a proxy URL → unchanged
 *  - Supabase URL into a private bucket → proxy URL
 *  - anything else (avatars bucket, pasted links, Google photos) → unchanged
 */
export function toProtectedUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/api/storage/")) return url;
  const parsed = parseStorageUrl(url);
  if (parsed && isPrivateBucket(parsed.bucket)) return protectedFileUrl(parsed.bucket, parsed.path);
  return url;
}

/** True when the URL is a stored file (proxy or Supabase object), not a pasted link. */
export function isStoredFileUrl(url: string): boolean {
  return url.startsWith("/api/storage/") || url.includes("/storage/v1/object/");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Which trip does an object path belong to? Mirrors the storage RLS policy:
 *   <userId>/<tripId>/...        (documents, receipts, wrap photos)
 *   <tripId>/bookings/...        (booking PDFs)
 * Returns the candidate tripIds to check membership against, plus the owner
 * uid folder when the path starts with one.
 */
export function pathGrant(path: string): { ownerId: string | null; tripIds: string[] } {
  const seg = path.split("/");
  const tripIds: string[] = [];
  const ownerId = UUID_RE.test(seg[0] ?? "") ? seg[0] : null;
  if (UUID_RE.test(seg[0] ?? "")) tripIds.push(seg[0]);
  if (UUID_RE.test(seg[1] ?? "")) tripIds.push(seg[1]);
  return { ownerId, tripIds };
}
