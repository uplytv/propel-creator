import { useState } from "react";
import {
  Eye, EyeOff, Copy, Check, Radio, WifiOff, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CreatorSoundboard from "./CreatorSoundboard";
import FeaturedProductPicker, { type Product } from "./FeaturedProductPicker";

interface ExternalEncoderViewProps {
  streamData: {
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
  };
  isLive: boolean;
  title: string;
  products: Product[];
  featuredProductId?: string | null;
  onFeaturedProductChange?: (id: string | null) => void;
  onEndStream: () => void;
  soundboard: {
    sounds: any[];
    playing: string | null;
    playSound: (id: string) => void;
    volume: number;
    setVolume: (v: number) => void;
  };
  onGoBack: () => void;
}

export default function ExternalEncoderView({
  streamData,
  isLive,
  title,
  products,
  featuredProductId,
  onFeaturedProductChange,
  onEndStream,
  soundboard,
  onGoBack,
}: ExternalEncoderViewProps) {
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const safeClipboardWrite = async (text: string) => {
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

  const copyToClipboard = async (text: string, field: string) => {
    const ok = await safeClipboardWrite(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onGoBack} className="text-muted-foreground hover:text-foreground transition-colors">
          ← 
        </button>
        <div>
          <h3 className="text-sm font-bold text-foreground">Live Stream via Encoder</h3>
          <p className="text-[10px] text-muted-foreground">Use OBS, Streamyard, or any RTMP app</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          {isLive ? (
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-destructive animate-pulse" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-bold text-sm text-foreground">{title}</p>
            {isLive ? (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
                You're LIVE
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for encoder connection…</p>
            )}
          </div>
        </div>

        {!isLive && (
          <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 mb-4">
            <div className="flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Copy the credentials below into your streaming software (OBS, Streamyard, etc). 
                Your stream will go LIVE automatically once the encoder connects.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">RTMP URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
                {streamData.rtmpUrl}
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyToClipboard(streamData.rtmpUrl, "rtmp")}>
                {copiedField === "rtmp" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Stream Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate">
                {showKey ? streamData.streamKey : "••••••••••••••••••••"}
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyToClipboard(streamData.streamKey, "key")}>
                {copiedField === "key" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isLive && (
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-foreground mb-2">How to go live:</p>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Open OBS Studio or Streamyard</li>
            <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Paste the RTMP URL and Stream Key above</li>
            <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Click "Start Streaming" — this page updates to LIVE automatically</li>
            <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Your stream is auto-recorded and saved to your library</li>
          </ol>
        </div>
      )}

      {isLive && (
        <CreatorSoundboard
          sounds={soundboard.sounds}
          playing={soundboard.playing}
          onPlay={soundboard.playSound}
          volume={soundboard.volume}
          onVolumeChange={soundboard.setVolume}
        />
      )}

      {products.length > 0 && (
        <FeaturedProductPicker
          products={products}
          featuredProductId={featuredProductId}
          onSelect={onFeaturedProductChange}
        />
      )}

      <Button variant="destructive" size="lg" onClick={onEndStream} className="w-full">
        {isLive ? "End Stream" : "Cancel & Start Over"}
      </Button>
    </div>
  );
}
