import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Play, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import SEOHead from "@/components/SEOHead";

export default function TicketSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const eventId = searchParams.get("event");
  const streamId = searchParams.get("stream");

  const [event, setEvent] = useState<any>(null);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) { setLoading(false); return; }

      const { data: evt } = await supabase
        .from("events")
        .select("id, title, location_name, location_city, starts_at")
        .eq("id", eventId)
        .single();
      if (evt) setEvent(evt);

      if (user) {
        // Poll for ticket (webhook may take a moment)
        let attempts = 0;
        const poll = async () => {
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
      } else {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, user]);

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

      {/* QR Code */}
      {ticket && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 mb-6"
        >
          <div className="w-[200px] h-[200px] bg-muted flex items-center justify-center">
            {/* Simple QR placeholder - uses the ticket token */}
            <div className="text-center">
              <Ticket className="w-12 h-12 text-foreground mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">{ticket.ticket_code || ticket.qr_code_token?.slice(0, 12)}</p>
            </div>
          </div>
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
