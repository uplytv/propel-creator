import { useParams } from "react-router-dom";
import { Loader2, Play, ShoppingBag, Check } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  useSamplePack,
  usePackSamples,
  usePurchasePack,
  useMyPurchasedPacks,
} from "../hooks/useSampleMarketplace";

export default function SamplePackPage() {
  const { id } = useParams<{ id: string }>();
  const { data: pack, isLoading } = useSamplePack(id);
  const { data: samples } = usePackSamples(id);
  const { data: purchased } = useMyPurchasedPacks();
  const purchase = usePurchasePack();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const owned = !!purchased?.some((p: any) => p.pack_id === id);

  const playPreview = (url: string, sampleId: string) => {
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url);
    audioRef.current = a;
    setPreviewing(sampleId);
    a.play().catch(() => setPreviewing(null));
    a.onended = () => setPreviewing(null);
  };

  const handlePurchase = async () => {
    if (!pack) return;
    try {
      await purchase.mutateAsync(pack);
      toast.success("Pack added to your library");
    } catch (e: any) {
      toast.error(e.message ?? "Purchase failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pack) {
    return <div className="p-6 text-center text-muted-foreground">Pack not found.</div>;
  }

  const priceLabel = pack.price_cents > 0
    ? `$${(pack.price_cents / 100).toFixed(2)}`
    : "Free";

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-48 aspect-square rounded-2xl overflow-hidden bg-muted shrink-0">
          {pack.cover_url && (
            <img src={pack.cover_url} alt={pack.title} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{pack.title}</h1>
          {pack.description && (
            <p className="text-sm text-muted-foreground">{pack.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {pack.bpm && <span>{pack.bpm} BPM</span>}
            {pack.music_key && <span>· {pack.music_key}</span>}
            {pack.genre && <span>· {pack.genre}</span>}
            <span>· {pack.sales_count} sold</span>
          </div>
          <div className="pt-2">
            {owned ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <Check className="w-4 h-4" /> Owned
              </div>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchase.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
              >
                <ShoppingBag className="w-4 h-4" />
                {priceLabel === "Free" ? "Get for free" : `Buy ${priceLabel}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground px-1">
          {samples?.length ?? 0} samples
        </h2>
        <div className="rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {samples?.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <button
                onClick={() => s.preview_url && playPreview(s.preview_url, s.id)}
                disabled={!s.preview_url}
                className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center disabled:opacity-40"
                aria-label="Preview"
              >
                {previewing === s.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {s.sample_type}
                  {s.bpm ? ` · ${s.bpm} BPM` : ""}
                  {s.music_key ? ` · ${s.music_key}` : ""}
                </div>
              </div>
              {owned && (
                <a
                  href={s.audio_url}
                  download
                  className="text-xs text-primary font-semibold"
                >
                  Download
                </a>
              )}
            </div>
          ))}
          {(!samples || samples.length === 0) && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No samples in this pack yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
