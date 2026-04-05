import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, X, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fireMetaEvent, fireGoogleEvent } from "@/lib/adTracking";

const tipPresets = [
  { amount: 5, emoji: "☕", label: "Coffee" },
  { amount: 25, emoji: "🔥", label: "Fire" },
  { amount: 50, emoji: "💎", label: "Diamond" },
  { amount: 100, emoji: "🚀", label: "Rocket" },
];

interface TipButtonProps {
  creatorId: string;
  creatorName: string;
  streamId?: string;
  creditsBalance: number;
  isLoggedIn: boolean;
  onTip: (amount: number, message: string) => void;
}

export default function TipButton({ creatorId, creatorName, streamId, creditsBalance, isLoggedIn, onTip }: TipButtonProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const amount = selected ?? (customAmount ? parseInt(customAmount, 10) : 0);

  const handleSend = async () => {
    if (amount <= 0) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-tip", {
        body: {
          amount,
          creator_id: creatorId,
          stream_id: streamId,
          message,
        },
      });
      if (error) throw error;
      if (data?.url) {
        // Redirect to Stripe checkout for real payment
        window.location.href = data.url;
        return;
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setSending(false);
  };

  if (!isLoggedIn) {
    return (
      <button className="p-2 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors" title="Log in to tip">
        <Coins className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-all text-sm font-medium"
      >
        <Coins className="w-3.5 h-3.5" />
        Tip
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0"
            >
              {sent ? (
                <div className="glass-card glow-border p-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="text-5xl mb-4">
                    {tipPresets.find(p => p.amount === amount)?.emoji ?? "✨"}
                  </motion.div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Tip Sent!</h3>
                  <p className="text-sm text-muted-foreground">You sent ${amount} to {creatorName}</p>
                </div>
              ) : (
                <div className="glass-card border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-warning" />
                      <h3 className="text-sm font-semibold text-foreground">Send a Tip</h3>
                    </div>
                    <button onClick={() => setOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {tipPresets.map((preset) => (
                        <button
                          key={preset.amount}
                          onClick={() => { setSelected(preset.amount); setCustomAmount(""); }}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                            selected === preset.amount ? "border-warning bg-warning/10 shadow-sm" : "border-border bg-secondary/30 hover:border-warning/30"
                          }`}
                        >
                          <span className="text-xl">{preset.emoji}</span>
                          <span className="text-xs font-semibold text-foreground">${preset.amount}</span>
                          <span className="text-[10px] text-muted-foreground">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        min="1"
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setSelected(null); }}
                        placeholder="Custom amount ($)..."
                        className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-warning/50 transition-colors"
                      />
                    </div>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                      placeholder="Add a message (optional)"
                      maxLength={100}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <Button
                      variant="hero"
                      onClick={handleSend}
                      disabled={amount <= 0 || sending}
                      className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
                    >
                      {sending ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-warning-foreground/30 border-t-warning-foreground rounded-full"
                        />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5" />
                          Send ${amount > 0 ? amount : ""} Tip
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      Powered by Stripe. 5% platform fee applies.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
