/**
 * Sprint 8 Item 1 — file-vs-link classification + on-device cache for
 * documents. Uploaded files live in the trip-documents Supabase bucket;
 * anything else is a pasted link that opens out to the browser.
 */

export function isFileDoc(url: string): boolean {
  return url.includes("/storage/v1/object/");
}

/** Best-effort format guess from the URL — the viewer trusts the blob's
 *  real content-type once fetched; this drives badges and thumbnails. */
export function fileFormat(url: string): "pdf" | "image" | "other" {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|heic|avif)$/.test(clean)) return "image";
  return "other";
}

/* ── IndexedDB blob cache ────────────────────────────────────────────────
   Files cache on first view so boarding passes open instantly at the
   gate with no network. Keyed by URL; no eviction — trip docs are small
   and the user can clear site data via Pocket Day. */

const DB_NAME = "paxawa-docs";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedDoc(url: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(url);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cacheDoc(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Cache is best-effort — viewing still works without it.
  }
}

/** Cache-first load. Returns null when offline with no cached copy. */
export async function loadDocBlob(url: string): Promise<{ blob: Blob; fromCache: boolean } | null> {
  const cached = await getCachedDoc(url);
  if (cached) return { blob: cached, fromCache: true };
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    void cacheDoc(url, blob);
    return { blob, fromCache: false };
  } catch {
    return null;
  }
}
