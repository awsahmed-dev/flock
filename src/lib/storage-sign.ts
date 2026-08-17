import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPrivateBucket, parseStorageUrl } from "@/lib/storage-url";

/**
 * authz-3: turn a stored file URL (proxy form or legacy Supabase form) into a
 * short-lived signed URL. For server-rendered PUBLIC surfaces (the share page)
 * where the viewer has no session for /api/storage. Non-private URLs pass
 * through unchanged.
 */
export async function signStoredUrl(url: string, expiresInSeconds = 3600): Promise<string | null> {
  let bucket: string | null = null;
  let path: string | null = null;
  const proxy = /^\/api\/storage\/([^/]+)\/(.+)$/.exec(url);
  if (proxy) {
    bucket = proxy[1];
    path = proxy[2].split("/").map(decodeURIComponent).join("/");
  } else {
    const parsed = parseStorageUrl(url);
    if (parsed) ({ bucket, path } = parsed);
  }
  if (!bucket || !path || !isPrivateBucket(bucket)) return url;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
