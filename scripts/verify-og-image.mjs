#!/usr/bin/env node
/**
 * Verifies the dynamic landing-page OG image:
 *   - HTTP 200
 *   - Content-Type: image/png
 *   - PNG IHDR reports 1200 x 630
 *
 * Fails the process (non-zero exit) on any mismatch so CI flags regressions
 * in the `og-render` Edge Function or the `LANDING_OG` copy contract.
 *
 * The canonical URL params here MUST match `LANDING_OG` in src/lib/ogImage.ts.
 * If you change one, change the other (a unit test could enforce this later).
 */

const OG_RENDER_BASE =
  "https://dbjlhmbgskvhuzqvqfrl.supabase.co/functions/v1/og-render";

const params = new URLSearchParams({
  title: "The Creator Operating System",
  subtitle:
    "Stream, teach, sell, and build community. Keep 95% of everything.",
  eyebrow: "UPLY",
  cta: "Join the waitlist",
  v: "1",
});

const url = process.env.OG_IMAGE_URL || `${OG_RENDER_BASE}?${params}`;
console.log(`Fetching OG image: ${url}`);

const res = await fetch(url);
if (!res.ok) {
  console.error(`::error::OG image fetch failed: HTTP ${res.status}`);
  process.exit(1);
}

const ct = res.headers.get("content-type") || "";
if (!ct.toLowerCase().startsWith("image/png")) {
  console.error(`::error::Expected content-type image/png, got "${ct}"`);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!buf.subarray(0, 8).equals(sig)) {
  console.error("::error::Response is not a valid PNG (bad signature)");
  process.exit(1);
}

// IHDR chunk starts at byte 8: [4 len][4 "IHDR"][13 data]
// Width  = bytes 16..19 (big-endian uint32)
// Height = bytes 20..23 (big-endian uint32)
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

console.log(`PNG dimensions: ${width}x${height} (${buf.length} bytes)`);

if (width !== 1200 || height !== 630) {
  console.error(`::error::Expected 1200x630, got ${width}x${height}`);
  process.exit(1);
}

console.log("✓ OG image OK");
