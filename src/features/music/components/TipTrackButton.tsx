import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  creatorId: string;
  trackId?: string;
}

const PRESETS = [1, 3, 5, 10, 20];

export default function TipTrackButton({ creatorId, trackId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(3);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const tip = async () => {
    if (!user) {
      toast({ title: "Sign in to tip" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-tip", {
        body: { amount, creator_id: creatorId, stream_id: trackId, message },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Could not start tip", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: "rgba(255,77,109,0.15)", color: "#FF4D6D", border: "1px solid rgba(255,77,109,0.4)" }}
        >
          <Heart className="w-4 h-4" /> Tip
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#0A0A0A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Send a tip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className="min-h-[44px] px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: amount === p ? "#3D7CFF" : "rgba(255,255,255,0.06)",
                  color: amount === p ? "#000" : "#fff",
                }}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            maxLength={140}
            className="w-full bg-white/5 text-white text-base placeholder:text-white/30 rounded-xl px-4 py-3 outline-none border border-transparent focus:border-white/20"
            style={{ fontSize: 16 }}
          />
          <button
            onClick={tip}
            disabled={loading}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full font-bold"
            style={{ background: "#3D7CFF", color: "#000" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
            Tip ${amount}
          </button>
          <p className="text-white/40 text-[11px] text-center">5% platform fee · paid securely via Stripe</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
