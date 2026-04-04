import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Download, ArrowLeft, ExternalLink, Clock, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInMinutes, isBefore } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TicketDetail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [refunding, setRefunding] = useState(false);

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

  const qrUrl = token ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}&bgcolor=0A0A0A&color=FFFFFF` : "";

  const event = ticket?.events;
  const isPast = event ? isBefore(new Date(event.ends_at), new Date()) : false;
  const virtualRevealed = event?.virtual_link_unlocked_at || (event && differenceInMinutes(new Date(event.starts_at), new Date()) <= 30);
  const isOwner = user && ticket && user.id === ticket.buyer_id;

  // Determine if refund is allowed
  const canRefund = (() => {
    if (!ticket || !event || ticket.status !== "active" || isPast) return false;
    if (!isOwner) return false;
    if (event.refund_policy === "no_refunds") return false;
    const hoursUntil = differenceInMinutes(new Date(event.starts_at), new Date()) / 60;
    if (event.refund_policy === "24_hours" && hoursUntil < 24) return false;
    if (event.refund_policy === "48_hours" && hoursUntil < 48) return false;
    if (event.refund_policy === "7_days" && hoursUntil < 168) return false;
    return true;
  })();

  async function handleRefund() {
    if (!ticket) return;
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-refund-ticket", {
        body: { ticket_id: ticket.id },
      });
      if (error) throw error;
      toast.success("Ticket refunded ✓", { description: "Your refund has been processed." });
      qc.invalidateQueries({ queryKey: ["ticket-detail"] });
    } catch (err: any) {
      toast.error("Refund failed", { description: err.message });
    } finally {
      setRefunding(false);
    }
  }

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

  return (
    <AppLayout>
      <div className="max-w-md mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
          {event?.cover_image_url && (
            <div className="aspect-video w-full overflow-hidden">
              <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {virtualRevealed ? "Virtual link available below" : "Virtual — link revealed 30 min before event"}
                </p>
              )}
            </div>

            {/* Virtual link reveal */}
            {event?.virtual_link && virtualRevealed && ticket.status === "active" && (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <p className="text-sm font-medium text-foreground mb-2">🔗 Your access link is ready</p>
                <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2 w-full"><ExternalLink className="w-4 h-4" /> Join Event</Button>
                </a>
              </div>
            )}
            {event?.virtual_link && !virtualRevealed && ticket.status === "active" && (
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Access link reveals 30 minutes before the event
                </p>
              </div>
            )}

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
                <img src={qrUrl} alt="QR Code" className="w-48 h-48" crossOrigin="anonymous" loading="lazy" />
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

            {/* Refund */}
            {canRefund && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={refunding}>
                    {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Cancel Ticket & Refund
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this ticket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {ticket.amount_paid > 0
                        ? `You'll receive a full refund of $${ticket.amount_paid.toFixed(2)} to your original payment method. This cannot be undone.`
                        : "Your free ticket will be canceled. This cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Ticket</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRefund} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Cancel & Refund
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
