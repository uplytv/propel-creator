/**
 * Optimistic mutation registry.
 *
 * Tracks per-row "in-flight" optimistic edits so realtime / webhook payloads
 * that race the server round-trip don't overwrite fresher local UI state.
 *
 * Conflict strategy (last-writer-wins, but client wins inside its own window):
 *   1. onMutate: call markPending(table, id) — records a timestamp.
 *   2. onSettled: call clearPending(table, id) after a short grace period so
 *      late-arriving realtime echoes of our own write are still ignored.
 *   3. Realtime handler: call shouldAcceptRealtime(table, id, payload) —
 *      returns false if a pending edit exists AND the payload's updated_at
 *      is older than (or equal to) our optimistic timestamp.
 */

type Key = string;

const PENDING_TTL_MS = 4_000; // grace window after server settles
const pending = new Map<Key, number>(); // key -> optimistic timestamp (ms)

const k = (table: string, id: string) => `${table}:${id}`;

export function markPending(table: string, id: string): number {
  const ts = Date.now();
  pending.set(k(table, id), ts);
  return ts;
}

export function clearPending(table: string, id: string) {
  const key = k(table, id);
  // Keep the marker briefly so realtime echoes of our own write are dropped.
  setTimeout(() => pending.delete(key), PENDING_TTL_MS);
}

export function hasPending(table: string, id: string): boolean {
  return pending.has(k(table, id));
}

/**
 * Returns true when the realtime payload should be applied to the cache.
 * Drops payloads whose updated_at is not strictly newer than our optimistic
 * timestamp while a mutation is still in-flight or in its grace window.
 */
export function shouldAcceptRealtime(
  table: string,
  id: string,
  payload: { updated_at?: string | null } | null | undefined,
): boolean {
  const stamp = pending.get(k(table, id));
  if (!stamp) return true;
  const updatedAt = payload?.updated_at ? Date.parse(payload.updated_at) : NaN;
  if (!Number.isFinite(updatedAt)) return false; // unknown freshness during pending → skip
  return updatedAt > stamp;
}
