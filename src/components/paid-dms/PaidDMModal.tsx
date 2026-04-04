import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaidDMModalProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  price: number;
}

export default function PaidDMModal({ open, onClose, creatorId, creatorName, price }: PaidDMModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      // Call edge function for payment
      const { data, error } = await supabase.functions.invoke("stripe-create-dm-payment", {
        body: {
          creator_id: creatorId,
          sender_id: user.id,
          message: message.trim(),
          amount: price,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        // Direct insert for free/wallet-based DMs
        const platformFee = price * 0.05;
        const creatorEarnings = price - platformFee;

        await supabase.from("paid_dms").insert({
          sender_id: user.id,
          creator_id: creatorId,
          message: message.trim(),
          amount: price,
          platform_fee: platformFee,
          creator_earnings: creatorEarnings,
        });

        // Notify creator
        const profile = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
        await supabase.from("notifications").insert({
          user_id: creatorId,
          type: "paid_dm",
          title: `💬 New paid message from ${profile.data?.display_name || "Someone"}`,
          message: message.trim().slice(0, 100),
          actor_id: user.id,
        });

        toast.success("Message sent! 💬", { description: `Your message to ${creatorName });
        onClose();
        setMessage("");
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden mb-16 sm:mb-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Send a Message</h3>
                  <p className="text-xs text-muted-foreground">to {creatorName} · ${price}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Write your message..."
              rows={5}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{message.length}/500</span>
              <span className="text-xs font-semibold" style={{ color: "hsl(var(--warning))" }}>
                ${price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-6 pt-0">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={handleSend}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>💬 Send & Pay ${price.toFixed(2)}</>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
