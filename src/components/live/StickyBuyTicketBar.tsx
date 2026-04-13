import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface StickyBuyTicketBarProps {
  event: {
    id: string;
    title: string;
    ticket_price: number;
    is_free: boolean;
    ticket_quantity?: number | null;
    tickets_sold?: number;
  };
  streamId: string;
}

export default function StickyBuyTicketBar({ event, streamId }: StickyBuyTicketBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [soldCount, setSoldCount] = useState(event.tickets_sold || 0);
  const [hasTicket, setHasTicket] = useState(false);

  const remaining = event.ticket_quantity ? event.ticket_quantity - soldCount : null;
  const isUrgent = remaining !== null && remaining < 20 && remaining > 0;
  const isSoldOut = remaining !== null && remaining <= 0;

  // Check if user already has a ticket
  useEffect(() => {
    if (!user) return;
    supabase
      .from("tickets")
      .select("id")
      .eq("event_id", event.id)
      .eq("buyer_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHasTicket(!!data));
  }, [user, event.id]);

  // Real-time ticket count
  useEffect(() => {
    const channel = supabase
      .channel(`buy-bar-tickets-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets", filter: `event_id=eq.${event.id}` },
        () => setSoldCount((c) => c + 1)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event.id]);

  const handleBuyTicket = async () => {
    if (!user) {
      navigate(`/auth?redirect=${window.location.pathname}`);
      return;
    }

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-event-checkout", {
        body: {
          event_id: event.id,
          success_url: `${window.location.origin}/tickets/success?event=${event.id}&stream=${streamId}`,
          cancel_url: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) {
        // Try window.open first for better mobile Safari support, fallback to redirect
        const popup = window.open(data.url, "_blank");
        if (!popup || popup.closed) {
          window.location.href = data.url;
        }
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Ticket checkout error:", err);
      toast.error(err?.message || "Could not start checkout. Try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (hasTicket) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5"
      style={{
        bottom: "64px",
        background: "rgba(10,10,10,0.96)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(0,255,133,0.2)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
        <Ticket className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-[13px] font-bold text-white truncate">{event.title}</span>
      </div>

      {isSoldOut ? (
        <button
          disabled
          className="px-5 py-2.5 rounded-[10px] text-sm font-extrabold whitespace-nowrap flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
            cursor: "not-allowed",
          }}
        >
          Sold Out
        </button>
      ) : (
        <button
          onClick={handleBuyTicket}
          disabled={isPurchasing}
          className="px-5 py-2.5 rounded-[10px] text-sm font-extrabold whitespace-nowrap flex-shrink-0 transition-all"
          style={{
            background: isUrgent
              ? "linear-gradient(135deg, #FF6B35, #FF3B30)"
              : "#00FF85",
            color: isUrgent ? "#FFFFFF" : "#0A0A0A",
            opacity: isPurchasing ? 0.7 : 1,
            animation: isUrgent ? "urgencyPulse 1.5s infinite" : undefined,
          }}
        >
          {isPurchasing ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
            </span>
          ) : isUrgent ? (
            `Only ${remaining} left — $${event.ticket_price} →`
          ) : event.is_free ? (
            "Get Free Ticket →"
          ) : (
            `Buy Ticket $${event.ticket_price} →`
          )}
        </button>
      )}

      <style>{`
        @keyframes urgencyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0); }
          50% { box-shadow: 0 0 0 6px rgba(255,59,48,0.3); }
        }
      `}</style>
    </div>
  );
}
