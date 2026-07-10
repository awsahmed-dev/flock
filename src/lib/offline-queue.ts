"use client";

/**
 * Phase 6 §10-B — the IndexedDB outbox. Writes made offline (check-offs,
 * expenses, pack toggles, votes) queue here and flush FIFO on reconnect.
 * No dependencies — raw IndexedDB, ~60 lines.
 */

export interface QueuedWrite {
  id: string;
  type: "expense" | "checkoff" | "vote" | "pack_toggle";
  payload: unknown;
  createdAt: number;
}

const DB_NAME = "paxawa-offline";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(write: Omit<QueuedWrite, "id" | "createdAt">): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ ...write, id: crypto.randomUUID(), createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function peekAll(): Promise<QueuedWrite[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedWrite[]).sort((a, b) => a.createdAt - b.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function remove(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Flush FIFO. `handlers` maps write type → executor; a failed write stays
 * queued (next reconnect retries). Returns the number synced.
 */
export async function flushQueue(
  handlers: Partial<Record<QueuedWrite["type"], (payload: unknown) => Promise<void>>>,
): Promise<number> {
  const items = await peekAll();
  let synced = 0;
  for (const item of items) {
    const handler = handlers[item.type];
    if (!handler) continue;
    try {
      await handler(item.payload);
      await remove(item.id);
      synced++;
    } catch {
      break; // keep FIFO order — retry from here next time
    }
  }
  return synced;
}
