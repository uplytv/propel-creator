import { Facebook, Instagram, Search, type LucideIcon } from "lucide-react";
import type { AdPlatform } from "@/hooks/useAdCampaigns";

/**
 * Ads Manager platform model.
 *
 * The three publishable surfaces (google / facebook / instagram) map onto UPLY's
 * two existing connection providers:
 *   - facebook + instagram  → the "meta" provider (ad_connections.provider = 'meta',
 *     ad_integrations.platform = 'meta')
 *   - google                → the "google" provider
 *
 * `connProvider` is what we look up in ad_connections (OAuth token / ad account).
 * `pixelPlatform` is what we look up in ad_integrations (pixel health).
 */
export interface PlatformMeta {
  id: AdPlatform;
  label: string;
  icon: LucideIcon;
  color: string; // hex, for accents
  connProvider: "meta" | "google";
  pixelPlatform: "meta" | "google";
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: "google",
    label: "Google",
    icon: Search,
    color: "#4285F4",
    connProvider: "google",
    pixelPlatform: "google",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    connProvider: "meta",
    pixelPlatform: "meta",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "#E4405F",
    connProvider: "meta",
    pixelPlatform: "meta",
  },
];

export const PLATFORM_BY_ID: Record<AdPlatform, PlatformMeta> = PLATFORMS.reduce(
  (acc, p) => ((acc[p.id] = p), acc),
  {} as Record<AdPlatform, PlatformMeta>,
);

export const OBJECTIVES: { id: string; label: string; desc: string }[] = [
  { id: "awareness", label: "Awareness", desc: "Maximize reach & impressions" },
  { id: "traffic", label: "Traffic", desc: "Send people to your page" },
  { id: "leads", label: "Leads", desc: "Grow your community / email list" },
  { id: "conversions", label: "Conversions", desc: "Drive purchases & signups" },
];

export const CTA_OPTIONS = [
  "Learn More",
  "Sign Up",
  "Shop Now",
  "Subscribe",
  "Get Offer",
  "Book Now",
  "Watch More",
];

export function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(0)}`;
}
