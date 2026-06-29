import { next, rewrite } from "@vercel/functions";

const LINK_PREVIEW_CRAWLER_RE =
  /facebookexternalhit|Facebot|Twitterbot|Slackbot|Applebot|redditbot|WhatsApp|LinkedInBot|Discordbot|TelegramBot|Pinterest|vkShare|Googlebot/i;

const PUBLIC_FILE_RE = /\.(?:js|mjs|css|map|json|png|jpe?g|gif|webp|avif|svg|ico|txt|xml|woff2?|ttf|otf|mp4|webm|mp3|wav|m4a|pdf)$/i;

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get("user-agent") || "";

  if (request.method !== "GET" && request.method !== "HEAD") return next();
  if (!LINK_PREVIEW_CRAWLER_RE.test(userAgent)) return next();
  if (url.pathname.startsWith("/api/")) return next();
  if (PUBLIC_FILE_RE.test(url.pathname)) return next();

  const destination = new URL("/api/og", request.url);
  const originalPath = `${url.pathname}${url.search}`;
  destination.searchParams.set("path", originalPath);

  const headers = new Headers(request.headers);
  headers.set("x-og-original-path", originalPath);
  headers.set("x-og-original-url", url.href);

  return rewrite(destination, { request: { headers } });
}
