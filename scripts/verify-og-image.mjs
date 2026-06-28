#!/usr/bin/env node
/**
 * Verifies the dynamic landing-page OG image:
 *   - HTTP 200
 *   - Content-Type: image/png
 *   - PNG IHDR reports 1200 x 630
 *
 * Fails the process (non-zero exit) on any mismatch so CI flags regressions
 * in the `og-render` Edge Function or the `LANDING_OG` copy contract.
 */
import { LANDING_OG_IMAGE_URL } from "../src/lib/ogImage.ts";

const url = process.env.OG_IMAGE_URL || LANDING_OG_IMAGE_URL;
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

const buf = new Uint8Array(await res.arrayBuffer());

// PNG signature: 89 50 4E 47 0D 0A 1A 0A
const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
for (let i = 0; i < sig.length; i++) {
  if (buf[i] !== sig[i]) {
    console.error("::error::Response is not a valid PNG (bad signature)");
    process.exit(1);
  }
}

// IHDR chunk starts at byte 8: [4 bytes length][4 bytes "IHDR"][13 bytes data]
// Width = bytes 16..19, Height = bytes 20..23 (big-endian uint32)
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const width = view.getUint32(16, false);
const height = view.getUint32(20, false);

console.log(`PNG dimensions: ${width}x${height} (${buf.length} bytes)`);

if (width !== 1200 || height !== 630) {
  console.error(
    `::error::Expected 1200x630, got ${width}x${height}`,
  );
  process.exit(1);
}

console.log("✓ OG image OK");
