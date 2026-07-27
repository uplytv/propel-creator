import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Build metadata injected at build time and surfaced by the /health page so we
// can confirm a deploy is actually live.
function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown";
  }
}
const BUILD_COMMIT = gitCommit();
const BUILD_TIME = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // The Lovable OAuth broker (Google/Apple sign-in) and `/api` routes are served by
    // Lovable's hosting, not by Vite. Locally those paths 404, so OAuth can't complete.
    // Proxy them to the hosted sandbox so social login works during `npm run dev`.
    proxy: {
      "/~oauth": {
        target: "https://36e6826b-627b-4e92-aef3-cf7c5112c94d.lovableproject.com",
        changeOrigin: true,
        secure: true,
      },
      "/api": {
        target: "https://36e6826b-627b-4e92-aef3-cf7c5112c94d.lovableproject.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Activate the new service worker immediately and purge stale precaches
        // so a deploy never leaves a tab serving an old index.html that points
        // at chunk files which no longer exist (the "black screen on deploy").
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Regression guard: no single precache entry may exceed 3 MB. Anything
        // bigger (a future oversized chunk or image) silently falls out of the
        // install payload instead of bloating first-visit downloads.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Don't force first-time visitors to download heavy on-demand chunks and
        // oversized marketing images upfront — they lazy-load normally and get
        // runtime-cached (rule below). Hashed filenames make this deploy-safe.
        globIgnores: [
          "**/hls-*.js",
          "**/BrowserQRCodeReader-*.js",
          "**/jspdf*",
          "**/generateCategoricalChart-*.js",
          "**/html2canvas*",
          "**/RichTextEditor-*.js",
          "**/favicon.png",
          "**/logo.png",
          "**/logo-*.png", // hashed emit of src/assets/logo.png (1.4 MB) — content-hashed, HTTP cache handles it
          "**/arya-xo-*.png",
        ],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/image\.mux\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "mux-thumbnails", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
          {
            // On-demand chunks excluded from precache: cache after first use.
            // Content-hashed filenames are immutable, so CacheFirst is safe.
            urlPattern: /\/assets\/.*\.js$/i,
            handler: "CacheFirst",
            options: { cacheName: "lazy-chunks", expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
        // Never cache live stream or payment endpoints
        navigateFallback: "index.html",
      },
      manifest: false, // Use existing public/manifest.json
    }),
  ].filter(Boolean),
  define: {
    "import.meta.env.VITE_BUILD_COMMIT": JSON.stringify(BUILD_COMMIT),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(BUILD_TIME),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(process.env.npm_package_version || "0.0.0"),
  },
  build: {
    rollupOptions: {
      external: [
        "@capacitor/status-bar",
      ],
      // NOTE: Do NOT add `manualChunks` here. A previous attempt split
      // `@radix-ui` and `react` into separate vendor chunks, which caused
      // Radix to evaluate before React was bound in some load orders and
      // crashed the app with `Cannot read properties of undefined (reading
      // 'forwardRef')` — a full black screen on production. Let Rollup pick
      // chunks automatically.
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query", "@supabase/supabase-js"],
    exclude: ["@capacitor/status-bar"],
  },
}));
