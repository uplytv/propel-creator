import { useState } from "react";
import { Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  trackId: string;
  isPaid: boolean;
  priceCents: number;
}

export default function TrackPriceEditor({ trackId, isPaid, priceCents }: Props) {
  const qc = useQueryClient();
  const [paid, setPaid] = useState(isPaid);
  const [price, setPrice] = useState((priceCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const cents = Math.max(0, Math.round(parseFloat(price || "0") * 100));
      const { error } = await supabase
        .from("tracks")
        .update({ is_paid: paid && cents > 0, price_cents: cents })
        .eq("id", trackId);
      if (error) throw error;
      toast({ title: paid && cents > 0 ? `Track set to $${(cents / 100).toFixed(2)}` : "Track is free" });
      qc.invalidateQueries({ queryKey: ["music", "track", trackId] });
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <Tag className="w-4 h-4" />
          {isPaid && priceCents ? `$${(priceCents / 100).toFixed(2)}` : "Set price"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="bg-[#0A0A0A] border-white/10 text-white w-72 space-y-3">
        <label className="flex items-center justify-between text-sm">
          <span>Paid release</span>
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
        </label>
        <div>
          <label className="block text-xs text-white/50 mb-1">Price (USD)</label>
          <input
            type="number"
            min="0"
            step="0.50"
            value={price}
            disabled={!paid}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-white/5 text-white rounded-lg px-3 py-2 outline-none disabled:opacity-50"
            style={{ fontSize: 16 }}
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full font-bold"
          style={{ background: "#3D7CFF", color: "#000" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save
        </button>
        <p className="text-white/40 text-[11px] text-center">5% platform fee · Stripe payouts</p>
      </PopoverContent>
    </Popover>
  );
}
