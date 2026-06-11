import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Copy, Check, Download, QrCode, ExternalLink, Share2, Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useContentShares } from "@/hooks/useContentShares";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { getSiteUrl } from "@/lib/siteUrl";

// Platform icons as simple SVG components
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.28 8.28 0 003.76.91V6.69z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface SharePanelProps {
  open: boolean;
  onClose: () => void;
  contentType: "clip" | "recording" | "stream";
  contentId: string;
  title: string;
  playbackId?: string | null;
  muxAssetId?: string | null;
  creatorUsername?: string | null;
  contentSlug?: string | null;
  url?: string;
}

function DownloadIcon() { return <Download className="w-6 h-6" />; }
function CopyIcon() { return <Copy className="w-6 h-6" />; }
function EmbedIcon() { return <ExternalLink className="w-6 h-6" />; }

const PLATFORMS = [
  { key: "tiktok", label: "TikTok", icon: TikTokIcon },
  { key: "instagram", label: "Instagram", icon: InstagramIcon },
  { key: "youtube", label: "YT Shorts", icon: YouTubeIcon },
  { key: "twitter", label: "X / Twitter", icon: TwitterIcon },
  { key: "linkedin", label: "LinkedIn", icon: LinkedInIcon, tooltip: "Great for professional audiences." },
  { key: "facebook", label: "Facebook", icon: FacebookIcon },
  { key: "download", label: "Download MP4", icon: DownloadIcon },
  { key: "copy", label: "Copy Link", icon: CopyIcon },
  { key: "embed", label: "Embed", icon: EmbedIcon },
];

export default function SharePanel({
  open,
  onClose,
  contentType,
  contentId,
  title,
  playbackId,
  muxAssetId,
  creatorUsername,
  contentSlug: propSlug,
  url: propUrl,
}: SharePanelProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const username = creatorUsername || profile?.username || profile?.display_name || "creator";
  const { totalShares, platformBreakdown, trackShare } = useContentShares(contentType, contentId);
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  // Use stable canonical routes so shared links always resolve to the exact content.
  const resolvedSlug = propSlug || contentId;

  const baseUrl = getSiteUrl();
  const contentUrl = propUrl ? propUrl
    : contentType === "stream"
      ? (username && propSlug && propSlug !== contentId
          ? `${baseUrl}/${encodeURIComponent(username)}/live/${propSlug}`
          : `${baseUrl}/stream/${contentId}`)
      : contentType === "recording"
        ? `${baseUrl}/stream/${contentId}?type=recording`
        : `${baseUrl}/${encodeURIComponent(username)}/clips/${resolvedSlug}`;

  const defaultCaption =
    contentType === "stream"
      ? `Watch ${title || 'my stream'} by ${username} on UPLY 🔥 → ${contentUrl}`
      : `Watch ${title || 'this'} by ${username} on UPLY 🔥 → ${contentUrl}`;
  const linkedInCaption = `Watch ${title || 'this'} by ${username} on UPLY → ${contentUrl}`;

  useEffect(() => {
    if (open) {
      setCaption(defaultCaption);
      setCopied(false);
      setShowQR(null);
    }
  }, [open, username]);

  const thumbnailUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=320&height=180&time=2`
    : null;

  const handleNativeShare = async (platform: string, videoBlob?: Blob) => {
    const shareData: ShareData = {
      title,
      text: platform === "linkedin" ? linkedInCaption : caption,
    };
    if (videoBlob) {
      const file = new File([videoBlob], `uply-${contentType}.mp4`, { type: "video/mp4" });
      if (navigator.canShare?.({ files: [file] })) {
        shareData.files = [file];
      }
    }
    if (!shareData.files) {
      shareData.url = contentUrl;
    }
    try {
      await navigator.share(shareData);
    } catch {
      // User cancelled
    }
  };

  const fetchVideoBlob = async (): Promise<Blob | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("download-asset", {
        body: {
          asset_id: contentId,
          asset_type: contentType === "clip" ? "clip" : contentType === "recording" ? "recording" : "vod",
        },
      });
      if (error || !data?.download_url) return null;
      const res = await fetch(data.download_url);
      return await res.blob();
    } catch {
      return null;
    }
  };

  const safeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handlePlatformClick = async (platform: string) => {
    trackShare(platform);

    switch (platform) {
      case "tiktok": {
        await safeClipboard(caption);
        toast.success("Caption copied! Opening TikTok…");
        if (isMobile && navigator.share) {
          const blob = await fetchVideoBlob();
          await handleNativeShare(platform, blob || undefined);
        } else {
          window.open("https://www.tiktok.com/upload", "_blank");
        }
        break;
      }
      case "instagram": {
        await safeClipboard(caption);
        toast.success("Caption copied! Opening Instagram…");
        if (isMobile && navigator.share) {
          const blob = await fetchVideoBlob();
          await handleNativeShare(platform, blob || undefined);
        } else {
          window.open("https://www.instagram.com/create/select", "_blank");
        }
        break;
      }
      case "youtube": {
        await safeClipboard(caption);
        toast.success("Caption copied! Opening YouTube Studio…");
        if (isMobile && navigator.share) {
          const blob = await fetchVideoBlob();
          await handleNativeShare(platform, blob || undefined);
        } else {
          window.open("https://studio.youtube.com", "_blank");
        }
        break;
      }
      case "twitter": {
        const tweetText = encodeURIComponent(caption);
        window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, "_blank");
        toast.success("Opening X/Twitter…");
        break;
      }
      case "linkedin": {
        window.open(
          `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(contentUrl)}&title=${encodeURIComponent(title)}`,
          "_blank"
        );
        toast.success("Opening LinkedIn…");
        break;
      }
      case "facebook": {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(contentUrl)}`,
          "_blank"
        );
        toast.success("Opening Facebook…");
        break;
      }
      case "download": {
        setDownloading(true);
        try {
          if (playbackId) {
            // Try Mux static MP4 first
            const mp4Url = `https://stream.mux.com/${playbackId}/high.mp4`;
            const res = await fetch(mp4Url);
            if (res.ok) {
              const blob = await res.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${title || "uply-video"}.mp4`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
              toast.success("Download started ✓");
            } else {
              throw new Error("MP4 not available");
            }
          } else {
            const { data, error } = await supabase.functions.invoke("download-asset", {
              body: {
                asset_id: contentId,
                asset_type: contentType === "clip" ? "clip" : contentType === "recording" ? "recording" : "vod",
              },
            });
            if (error || !data?.download_url) {
              toast.error("Download failed", { description: "Could not fetch video" });
            } else {
              const a = document.createElement("a");
              a.href = data.download_url;
              a.download = `uply-${contentType}-${contentId}.mp4`;
              a.target = "_blank";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              toast.success("Download started ✓");
            }
          }
        } catch {
          toast.error("Download failed");
        }
        setDownloading(false);
        break;
      }
      case "copy": {
        const ok = await safeClipboard(contentUrl);
        if (ok) {
          setCopied(true);
          toast.success("Link copied ✓");
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast.error("Could not copy link");
        }
        break;
      }
      case "embed": {
        const embedCode = `<iframe src="${contentUrl}?embed=true" width="560" height="315" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`;
        const embedOk = await safeClipboard(embedCode);
        setEmbedCopied(true);
        setShowEmbed(true);
        toast.success("Embed code copied ✓");
        setTimeout(() => setEmbedCopied(false), 2000);
        break;
      }
    }
  };

  const panelContent = (
    <div className="space-y-5 pb-8">
      {/* Preview Row */}
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(var(--background))" }}>
        <div className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          {/* UPLY watermark badge */}
          <div
            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--background))",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            uply.tv
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title || "Untitled"}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{contentType}</p>
        </div>
      </div>

      {/* Editable Caption */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Caption</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className="w-full rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
          style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
        />
      </div>

      {/* QR Code overlay */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl p-6 text-center space-y-3"
            style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
          >
            <QrCode className="w-16 h-16 mx-auto text-primary" />
            <p className="text-sm text-foreground font-medium">
              Scan to share to {showQR === "tiktok" ? "TikTok" : "Instagram"} from your phone
            </p>
            <p className="text-[10px] text-muted-foreground break-all">{contentUrl}</p>
            <button
              onClick={() => setShowQR(null)}
              className="text-xs text-primary hover:underline"
            >
              ← Back to platforms
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embed Code Display */}
      <AnimatePresence>
        {showEmbed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl p-4 space-y-2 overflow-hidden"
            style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
          >
            <p className="text-xs font-medium text-foreground">Embed Code</p>
            <code className="block text-[11px] text-muted-foreground bg-black/50 rounded-lg p-3 break-all font-mono">
              {`<iframe src="${contentUrl}?embed=true" width="560" height="315" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`}
            </code>
            <button
              onClick={async () => {
                await safeClipboard(`<iframe src="${contentUrl}?embed=true" width="560" height="315" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`);
                toast.success("Embed code copied ✓");
              }}
              className="text-xs text-primary hover:underline"
            >
              Copy Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Grid */}
      {!showQR && (
        <TooltipProvider>
          <div className="grid grid-cols-3 gap-2.5">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              const isDownload = p.key === "download";
              const isCopy = p.key === "copy";
              const isEmbed = p.key === "embed";

              const button = (
                <button
                  key={p.key}
                  onClick={() => handlePlatformClick(p.key)}
                  disabled={isDownload && downloading}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:scale-105 active:scale-95"
                  style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
                >
                  <div className="text-foreground">
                    {isDownload && downloading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isCopy && copied ? (
                      <Check className="w-6 h-6 text-primary" />
                    ) : isEmbed && embedCopied ? (
                      <Check className="w-6 h-6 text-primary" />
                    ) : (
                      <Icon />
                    )}
                  </div>
                  <span className="text-foreground text-[11px] font-medium leading-tight text-center">
                    {isCopy && copied ? "Copied!" : isEmbed && embedCopied ? "Copied!" : p.label}
                  </span>
                </button>
              );

              if (p.tooltip) {
                return (
                  <Tooltip key={p.key}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[160px]">
                      {p.tooltip}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              if (p.key === "youtube") {
                return (
                  <Tooltip key={p.key}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                      Videos under 60 seconds automatically become Shorts.
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Copy Link field */}
      <div className="flex items-center gap-2 rounded-xl overflow-hidden" style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}>
        <input
          readOnly
          value={contentUrl}
          className="flex-1 px-3 py-2.5 text-xs text-muted-foreground bg-transparent outline-none truncate"
        />
        <button
          onClick={() => handlePlatformClick("copy")}
          className="px-4 py-2.5 text-xs font-bold transition-colors flex-shrink-0"
          style={{ color: copied ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      {/* Share Stats */}
      {totalShares > 0 && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}>
          <p className="text-xs text-muted-foreground">
            This {contentType} has been shared <span className="text-primary font-bold">{totalShares}</span> time{totalShares !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {platformBreakdown.map((pb) => {
              const plat = PLATFORMS.find((p) => p.key === pb.platform);
              return (
                <span
                  key={pb.platform}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground"
                  style={{ background: "hsl(var(--card))" }}
                >
                  {plat?.label || pb.platform} {pb.count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[90vh]" style={{ background: "hsl(var(--background))" }}>
          <DrawerHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-foreground text-base">Share & Distribute</DrawerTitle>
                <DrawerDescription className="sr-only">Share this content link or export it to external platforms.</DrawerDescription>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto pb-safe">{panelContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px] max-h-[85vh] overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Share & Distribute</DialogTitle>
          <DialogDescription className="sr-only">Share this content link or export it to external platforms.</DialogDescription>
        </DialogHeader>
        {panelContent}
      </DialogContent>
    </Dialog>
  );
}
