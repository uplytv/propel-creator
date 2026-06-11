import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [soldCount, setSoldCount] = useState(event.tickets_sold || 0);
  const [hasTicket, setHasTicket] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const remaining = event.ticket_quantity ? event.ticket_quantity - soldCount : null;
  const isUrgent = remaining !== null && remaining < 20 && remaining > 0;
  const isSoldOut = remaining !== null && remaining <= 0;

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

  const handleBuyTicket = () => {
    if (!user) {
      navigate(`/auth?redirect=${window.location.pathname}`);
      return;
    }
    setShowPurchase(true);
  };

  if (hasTicket) return null;

  return (
    <>
      <div
        className="fixed left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5"
        style={{
          bottom: "64px",
          background: "rgba(10,10,10,0.96)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(61, 124, 255,0.2)",
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
            className="px-5 py-2.5 rounded-[10px] text-sm font-extrabold whitespace-nowrap flex-shrink-0 transition-all"
            style={{
              background: isUrgent
                ? "linear-gradient(135deg, #FF6B35, #FF3B30)"
                : "#3D7CFF",
              color: isUrgent ? "#FFFFFF" : "#0A0A0A",
              animation: isUrgent ? "urgencyPulse 1.5s infinite" : undefined,
            }}
          >
            {isUrgent ? (
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

      <PurchaseOverlay
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
        onSuccess={() => {
          setHasTicket(true);
          queryClient.invalidateQueries({ queryKey: ["tickets"] });
        }}
        purchaseType="ticket"
        purchaseParams={{
          event_id: event.id,
          success_url: `${window.location.origin}/tickets/success?event=${event.id}&stream=${streamId}`,
          cancel_url: window.location.href,
        }}
        title={event.title}
        description="Event Ticket"
        price={event.ticket_price}
      />
    </>
  );
}
