/**
 * Format a number as a compact human-readable count: 11.5K, 1.2M, 9.8B.
 * Used in StatsStrip on creator profiles.
 */
export function formatCount(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);
  if (abs < 1000) return String(Math.round(v));
  if (abs < 1_000_000) return strip(v / 1000) + "K";
  if (abs < 1_000_000_000) return strip(v / 1_000_000) + "M";
  return strip(v / 1_000_000_000) + "B";
}

function strip(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}
