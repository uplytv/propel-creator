import { ImageIcon, MoreHorizontal, ThumbsUp, MessageCircle, Share2 } from "lucide-react";
import { PLATFORM_BY_ID } from "./platforms";
import type { AdPlatform } from "@/hooks/useAdCampaigns";

/**
 * Live ad-preview — mirrors the builder fields as they're typed. Deliberately a
 * generic social-ad mock (works for Facebook / Instagram / Google display).
 */
export default function AdPreviewCard({
  platform,
  headline,
  primaryText,
  cta,
  creativeUrl,
  advertiser,
}: {
  platform: AdPlatform;
  headline: string;
  primaryText: string;
  cta: string;
  creativeUrl: string;
  advertiser: string;
}) {
  const meta = PLATFORM_BY_ID[platform];
  const Icon = meta.icon;

  return (
    <div className="border border-border bg-card w-full max-w-sm mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3">
        <div
          className="w-8 h-8 flex items-center justify-center text-white text-xs font-bold"
          style={{ background: meta.color }}
        >
          {advertiser?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate">{advertiser || "Your brand"}</p>
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            Sponsored · <Icon className="w-3 h-3" />
          </p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Primary text */}
      <p className="px-3 pb-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
        {primaryText || (
          <span className="text-muted-foreground">Your primary text will appear here…</span>
        )}
      </p>

      {/* Creative */}
      <div className="aspect-[1.91/1] bg-muted flex items-center justify-center overflow-hidden">
        {creativeUrl ? (
          <img
            src={creativeUrl}
            alt="Ad creative preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="w-6 h-6" />
            <span className="text-[11px]">Image preview</span>
          </div>
        )}
      </div>

      {/* Headline + CTA bar */}
      <div className="flex items-center gap-3 p-3 bg-muted/40 border-t border-border">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {advertiser ? `${advertiser}.uply.tv` : "uply.tv"}
          </p>
          <p className="text-[13px] font-semibold truncate">
            {headline || "Your headline goes here"}
          </p>
        </div>
        <span className="shrink-0 border border-border bg-background px-3 py-1.5 text-[12px] font-semibold">
          {cta || "Learn More"}
        </span>
      </div>

      {/* Engagement row (visual only) */}
      <div className="flex items-center justify-around px-3 py-2 text-[11px] text-muted-foreground border-t border-border">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="w-3.5 h-3.5" /> Like
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" /> Comment
        </span>
        <span className="inline-flex items-center gap-1">
          <Share2 className="w-3.5 h-3.5" /> Share
        </span>
      </div>
    </div>
  );
}
