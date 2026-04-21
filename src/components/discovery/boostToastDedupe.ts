// Module-level dedupe so the same boost only fires an "ending" / "ended" toast
// once across many DiscoveryFeedCard instances rendering the same promoted item.
const notifiedEndingBoosts = new Set<string>();
const notifiedEndedBoosts = new Set<string>();

export function notifyBoostEndingOnce(key: string, run: () => void): boolean {
  if (notifiedEndingBoosts.has(key)) return false;
  notifiedEndingBoosts.add(key);
  run();
  return true;
}

export function notifyBoostEndedOnce(key: string, run: () => void): boolean {
  if (notifiedEndedBoosts.has(key)) return false;
  notifiedEndedBoosts.add(key);
  run();
  return true;
}

// Test-only helpers.
export function __resetBoostToastDedupeForTests() {
  notifiedEndingBoosts.clear();
  notifiedEndedBoosts.clear();
}
