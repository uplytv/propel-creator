import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { PersonCard } from "@/hooks/usePeopleSwipe";

interface SuperHeySheetProps {
  person: PersonCard;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SuperHeySheet({ person, onClose, onSuccess }: SuperHeySheetProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-dm-payment", {
        body: {
          recipient_id: person.user_id,
          amount: 899,
          source: "super_hey",
          message: message || `⚡ Super Hey from ${user.user_metadata?.full_name || "someone"}!`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
      // Insert the hey record
      await supabase.from("heys").upsert({
        sender_id: user.id,
        recipient_id: person.user_id,
        hey_type: "super",
      }, { onConflict: "sender_id,recipient_id" });

      await supabase.from("notifications").insert({
        user_id: person.user_id,
        type: "super_hey",
        title: "⚡ Someone sent you a Super Hey!",
        message: message || "You got a Super Hey — check your inbox!",
        actor_id: user.id,
        read: false,
      });

      toast.success("Super Hey sent! ⚡");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to send Super Hey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[99]" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[100]"
        style={{
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          padding: "16px 20px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" }} />

        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: "rgba(255,255,255,0.5)" }}>
          <X className="w-5 h-5" />
        </button>

        <p className="text-xl font-bold text-white mb-2">⚡ Super Hey {person.display_name}</p>
        <p className="text-sm text-white/50 mb-4 leading-relaxed">
          Your message goes to the TOP of their inbox — identity revealed immediately. No waiting for a mutual match.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a message (optional)..."
          className="w-full p-3 rounded-xl text-sm text-white placeholder:text-white/30 mb-4 resize-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 80 }}
          rows={3}
        />

        <button
          onClick={handleSend}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #FFD700, #FF8C00)",
            color: "#0A0A0A",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Processing..." : "⚡ Send Super Hey — $8.99"}
        </button>

        <button onClick={onClose} className="w-full mt-3 text-center text-white/40 text-sm">
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
