// Dynamic Open Graph image renderer (1200x630 PNG) with UPLY brand styling.
// Query params:
//   ?title=...      Headline (large)
//   ?subtitle=...   Supporting copy (smaller)
//   ?eyebrow=...    Small uppercase label above title (optional)
//   ?cta=...        Pill CTA at the bottom (optional)
//
// Returns: image/png, cached aggressively for CDN.
//
// Example: /functions/v1/og-render?title=Keep%2095%25&subtitle=The%20Creator%20OS
//
// Implementation note: We render an SVG with embedded fonts, then convert to PNG
// using @resvg/resvg-wasm so all crawlers (incl. Twitter, which does not render
// SVG OG images) get a valid image.

import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const WASM_URL = "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm";
const FONT_URL =
  "https://fonts.gstatic.com/s/spacegrotesk/v15/V8mDoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7aUUM.woff2";
const BODY_FONT_URL =
  "https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_qU79TIA.woff2";

let wasmReady: Promise<void> | null = null;
let fontBytes: Uint8Array | null = null;
let bodyFontBytes: Uint8Array | null = null;

async function ensureReady() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasm = await fetch(WASM_URL).then((r) => r.arrayBuffer());
      await initWasm(new Uint8Array(wasm));
      const [f1, f2] = await Promise.all([
        fetch(FONT_URL).then((r) => r.arrayBuffer()),
        fetch(BODY_FONT_URL).then((r) => r.arrayBuffer()),
      ]);
      fontBytes = new Uint8Array(f1);
      bodyFontBytes = new Uint8Array(f2);
    })();
  }
  await wasmReady;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Crude word-wrap so long headlines stay on the canvas.
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.length > lines.join(" ").split(/\s+/).length) {
    // ellipsize last line
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > maxChars - 1 ? last.slice(0, maxChars - 1) + "…" : last + "…";
  }
  return lines;
}

function buildSvg(opts: {
  title: string;
  subtitle: string;
  eyebrow: string;
  cta: string;
}) {
  const W = 1200;
  const H = 630;
  const titleLines = wrap(opts.title, 26, 3);
  const subLines = wrap(opts.subtitle, 60, 2);
  const titleStart = 240 + (3 - titleLines.length) * 40; // vertical centering tweak

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0A0A0A"/>
      <stop offset="100%" stop-color="#0E0B1F"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.2" cy="0.2" r="0.6">
      <stop offset="0%" stop-color="#3D7CFF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#3D7CFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.85" cy="0.9" r="0.55">
      <stop offset="0%" stop-color="#B025FF" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#B025FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3D7CFF"/>
      <stop offset="100%" stop-color="#B025FF"/>
    </linearGradient>
    <pattern id="grid" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#FFFFFF" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>

  <!-- Brand mark -->
  <g transform="translate(80, 80)">
    <text x="0" y="0" font-family="Space Grotesk" font-weight="800" font-size="40" fill="url(#brand)" letter-spacing="2">UPLY</text>
    <rect x="118" y="-26" width="8" height="32" rx="2" fill="url(#brand)"/>
  </g>

  ${opts.eyebrow ? `
  <text x="80" y="${titleStart - 60}" font-family="Plus Jakarta Sans" font-weight="600" font-size="22" fill="#9CA3AF" letter-spacing="6">${esc(opts.eyebrow.toUpperCase())}</text>
  ` : ""}

  <!-- Title -->
  ${titleLines.map((line, i) => `
    <text x="80" y="${titleStart + i * 88}" font-family="Space Grotesk" font-weight="700" font-size="84" fill="#FFFFFF" letter-spacing="-2">${esc(line)}</text>
  `).join("")}

  <!-- Subtitle -->
  ${subLines.map((line, i) => `
    <text x="80" y="${titleStart + titleLines.length * 88 + 50 + i * 40}" font-family="Plus Jakarta Sans" font-weight="500" font-size="30" fill="#D1D5DB">${esc(line)}</text>
  `).join("")}

  <!-- CTA pill -->
  ${opts.cta ? `
  <g transform="translate(80, ${H - 110})">
    <rect x="0" y="0" width="${Math.min(560, 60 + opts.cta.length * 16)}" height="62" rx="31" fill="url(#brand)"/>
    <text x="32" y="40" font-family="Plus Jakarta Sans" font-weight="700" font-size="24" fill="#0A0A0A">${esc(opts.cta)}</text>
  </g>
  ` : ""}

  <!-- Footer URL -->
  <text x="${W - 80}" y="${H - 60}" text-anchor="end" font-family="Plus Jakarta Sans" font-weight="600" font-size="22" fill="#9CA3AF">uply.tv</text>

  <!-- Bottom accent bar -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#brand)"/>
</svg>`;
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const url = new URL(req.url);
    const title = (url.searchParams.get("title") || "The Creator Operating System").slice(0, 120);
    const subtitle = (url.searchParams.get("subtitle") || "Stream, teach, sell, and build community. Keep 95% of everything.").slice(0, 200);
    const eyebrow = (url.searchParams.get("eyebrow") || "UPLY").slice(0, 40);
    const cta = (url.searchParams.get("cta") || "Join the waitlist").slice(0, 32);

    await ensureReady();

    const svg = buildSvg({ title, subtitle, eyebrow, cta });
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
      font: {
        fontBuffers: [fontBytes!, bodyFontBytes!],
        loadSystemFonts: false,
        defaultFontFamily: "Space Grotesk",
      },
    });
    const png = resvg.render().asPng();

    return new Response(png, {
      headers: {
        ...cors,
        "Content-Type": "image/png",
        // 1 hour browser, 1 day CDN, allow stale-while-revalidate for a week.
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("[og-render] failed", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
