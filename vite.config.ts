import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

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
      includeAssets: ["favicon.png", "logo.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
        ],
        // Never cache live stream or payment endpoints
        navigateFallback: "index.html",
      },
      manifest: false, // Use existing public/manifest.json
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      external: [
        "@capacitor/status-bar",
      ],
      output: {
        // Split large, stable vendor libs out of the main entry chunk so the
        // initial bundle is smaller and vendor code caches across deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react-vendor";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("framer-motion")) return "motion";
        },
      },
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
