import { useRef } from "react";
import { Share2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildTrackShareUrl } from "@/lib/shareUrls";

interface Props {
  trackId: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
}

/**
 * Shareable now-playing card. Renders a branded card (UPLY) and lets the user
 * either share via the native share sheet or download a PNG snapshot.
 */
export default function NowPlayingShareCard({ trackId, title, artist, coverUrl }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = buildTrackShareUrl(trackId, "web_share");

  const onShare = async () => {
    const text = `Now playing: ${title} — ${artist}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url: shareUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      toast({ title: "Link copied", description: "Share it anywhere." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const onDownload = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      if (!cardRef.current) return;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0A0A0A",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `uply-${trackId.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="rounded-2xl overflow-hidden p-5 mx-auto"
        style={{
          background: "linear-gradient(135deg, #0A0A0A 0%, #001a0d 100%)",
          width: 320,
          aspectRatio: "9 / 16",
          maxWidth: "100%",
        }}
      >
        <div className="text-primary font-black text-xs tracking-widest mb-3">NOW PLAYING ON UPLY</div>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            crossOrigin="anonymous"
            className="w-full aspect-square rounded-xl object-cover mb-4"
          />
        ) : (
          <div className="w-full aspect-square rounded-xl mb-4 bg-white/10" />
        )}
        <h3 className="text-white font-black text-xl leading-tight mb-1">{title}</h3>
        <p className="text-white/60 text-sm font-medium mb-6">{artist}</p>
        <div className="flex items-end justify-between mt-auto">
          <div className="text-white/40 text-[10px] font-mono">uply.tv</div>
          <div className="h-6 w-12 rounded bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-[10px] font-black">UPLY</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onShare}
          className="flex-1 rounded-lg bg-primary text-black font-bold py-3 text-sm flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button
          onClick={onDownload}
          className="flex-1 rounded-lg bg-white/10 text-white font-bold py-3 text-sm flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Download className="w-4 h-4" /> Save PNG
        </button>
      </div>
    </div>
  );
}
