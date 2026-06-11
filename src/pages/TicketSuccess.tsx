import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Play, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import SEOHead from "@/components/SEOHead";
import WalletPassButtons from "@/components/tickets/WalletPassButtons";

export default function TicketSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const eventId = searchParams.get("event");
  const orderId = searchParams.get("order");
  const streamId = searchParams.get("stream");

  const [event, setEvent] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadEvent = async (id: string) => {
      const { data: evt } = await supabase
        .from("events")
        .select("id, title, location_name, location_city, starts_at")
        .eq("id", id)
        .maybeSingle();
      if (evt && !cancelled) setEvent(evt);
    };

    const fetchData = async () => {
      if (!user) { setLoading(false); return; }

      // Tier flow (order_type='primary_ticket'): the Stripe webhook does not
      // finalize tier orders, so trigger finalization here, then load the ticket.
      if (orderId) {
        try {
          await supabase.functions.invoke("finalize-ticket-order", { body: { order_id: orderId } });
        } catch { /* the reconciliation cron will retry */ }
        let attempts = 0;
        const poll = async () => {
          if (cancelled) return;
          const { data: tkt } = await supabase
            .from("tickets")
            .select("id, qr_code_token, qr_code_secret, ticket_number, event_id")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (tkt) {
            setTicket(tkt);
            if (tkt.event_id) loadEvent(tkt.event_id);
            setLoading(false);
          } else if (attempts < 8) {
            attempts++;
            setTimeout(poll, 1500);
          } else {
            setLoading(false);
          }
        };
        poll();
        return;
      }

      // Legacy event flow: poll for the ticket the webhook creates.
      if (!eventId) { setLoading(false); return; }
      loadEvent(eventId);
      let attempts = 0;
      const poll = async () => {
        if (cancelled) return;
        const { data: tkt } = await supabase
          .from("tickets")
          .select("id, qr_code_token, qr_code_secret, ticket_number")
          .eq("event_id", eventId)
          .eq("buyer_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tkt) {
          setTicket(tkt);
          setLoading(false);
        } else if (attempts < 10) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setLoading(false);
        }
      };
      poll();
    };
    fetchData();
    return () => { cancelled = true; };
  }, [eventId, orderId, user]);

  const handleDirections = () => {
    if (!event) return;
    const query = encodeURIComponent(`${event.location_name || ""} ${event.location_city || ""}`);
    window.open(`https://maps.apple.com/?q=${query}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <SEOHead title="You're Going! | UPLY" description="Your ticket has been confirmed" />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="text-6xl mb-6"
      >
        🎟️
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[28px] font-bold text-foreground mb-2"
      >
        You're Going!
      </motion.h1>

      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-6"
        >
          <p className="text-lg font-semibold text-foreground">{event.title}</p>
          <p className="text-sm text-muted-foreground">
            Tonight · {event.location_name || "Virtual"}
          </p>
        </motion.div>
      )}

      {/* QR Code — encodes the private secret, scannable at the door */}
      {ticket && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-4 mb-6"
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(ticket.qr_code_secret || ticket.qr_code_token)}`}
            alt="Ticket QR code"
            className="w-[200px] h-[200px]"
            crossOrigin="anonymous"
          />
          <p className="text-[10px] font-mono text-muted-foreground text-center mt-2">{ticket.ticket_number || ticket.qr_code_token.slice(0, 12)}</p>
        </motion.div>
      )}

      {loading && !ticket && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground mb-6 animate-pulse"
        >
          Generating your ticket...
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        {ticket && <WalletPassButtons ticketId={ticket.id} />}

        {ticket && (
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={() => navigate(`/tickets/${ticket.qr_code_token}`)}
          >
            <Ticket className="w-4 h-4" /> View Full Ticket
          </Button>
        )}

        {streamId && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate(`/stream/${streamId}`)}
          >
            <Play className="w-4 h-4" /> Watch Stream <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}

        {event?.location_name && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleDirections}
          >
            <MapPin className="w-4 h-4" /> Get Directions 📍
          </Button>
        )}
      </motion.div>
    </div>
  );
}
