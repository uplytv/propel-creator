// Module-level dedupe so we only invalidate the discovery feed ONCE per boost
// expiry, even when multiple cards (the same boost surfaced in different feeds)
// fire simultaneously.
const invalidatedBoostExpiries = new Set<string>();

export function invalidateBoostFeedOnce(key: string, run: () => void): boolean {
  if (invalidatedBoostExpiries.has(key)) return false;
  invalidatedBoostExpiries.add(key);
  run();
  return true;
}

export function boostExpiryKey(
  contentType: string,
  contentId: string,
  expiresAt: string,
): string {
  return `${contentType}:${contentId}:${expiresAt}`;
}

// Test-only: reset the dedupe set between tests.
export function __resetInvalidatedBoostExpiriesForTests() {
  invalidatedBoostExpiries.clear();
}
