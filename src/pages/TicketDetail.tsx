import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Download, Loader2, ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function TicketDetail() {
  const { token } = useParams();
  const navigate = useNavigate();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket-detail", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tickets")
        .select("*, events:event_id(*)")
        .eq("qr_code_token", token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: buyerProfile } = useQuery({
    queryKey: ["ticket-buyer", ticket?.buyer_id],
    enabled: !!ticket,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, username").eq("user_id", ticket.buyer_id).maybeSingle();
      return data;
    },
  });

  // Generate QR code URL using a free API
  const qrUrl = token ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}&bgcolor=0A0A0A&color=FFFFFF` : "";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-xl mb-4" />
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-64 w-64 mx-auto rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Ticket not found</div>
      </AppLayout>
    );
  }

  const event = ticket.events;

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Event cover */}
          {event?.cover_image_url && (
            <div className="aspect-video w-full overflow-hidden">
              <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">{event?.title || "Event"}</h2>

            <div className="space-y-2 text-sm text-muted-foreground">
              {event && (
                <p className="flex items-center gap-2 text-primary">
                  <CalendarDays className="w-4 h-4" />
                  {format(new Date(event.starts_at), "EEE MMM d · h:mm a")}
                </p>
              )}
              {event?.location_name && (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {event.location_name}
                </p>
              )}
              {!event?.location_name && event?.event_type !== "in_person" && (
                <p className="flex items-center gap-2">Virtual — link revealed 30 min before event</p>
              )}
            </div>

            <div className="py-1 border-t border-border" />

            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Attendee</p>
              <p className="text-foreground font-medium">{buyerProfile?.display_name || buyerProfile?.username || "—"}</p>
            </div>

            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Ticket ID</p>
              <p className="text-foreground font-mono text-xs">{ticket.qr_code_token}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center py-4">
              <div className="bg-background p-4 rounded-xl border border-border">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" crossOrigin="anonymous" />
              </div>
            </div>

            {/* Status */}
            <div className="text-center">
              {ticket.status === "active" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary text-sm rounded-full font-medium">✓ Active</span>
              )}
              {ticket.status === "used" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">Checked In</span>
              )}
              {ticket.status === "refunded" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/20 text-destructive text-sm rounded-full">Refunded</span>
              )}
              {ticket.status === "canceled" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/20 text-destructive text-sm rounded-full">Canceled</span>
              )}
            </div>

            {/* Download */}
            <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
              <Download className="w-4 h-4" /> Download Ticket
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
