import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useBookingInquiry,
  useBookingMessages,
  useSendBookingMessage,
  useUpdateBookingInquiryStatus,
} from "../hooks/useGigMarketplace";
import { supabase } from "@/integrations/supabase/client";

export default function BookingInquiryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: inquiry, isLoading } = useBookingInquiry(id);
  const { data: messages = [] } = useBookingMessages(id);
  const send = useSendBookingMessage();
  const updateStatus = useUpdateBookingInquiryStatus();
  const [body, setBody] = useState("");
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!inquiry) return <div className="p-6">Inquiry not found.</div>;

  const isArtist = me === inquiry.artist_id;

  const handleSend = async () => {
    if (!body.trim()) return;
    await send.mutateAsync({ inquiry_id: inquiry.id, body });
    setBody("");
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-display font-bold">{inquiry.event_title || "Booking inquiry"}</h1>
          <Badge className="capitalize">{inquiry.status}</Badge>
        </div>
        {inquiry.event_date && <p className="text-sm">{new Date(inquiry.event_date).toLocaleString()}</p>}
        {inquiry.event_location && <p className="text-sm text-muted-foreground">{inquiry.event_location}</p>}
        {inquiry.budget_cents && (
          <p className="text-sm text-primary mt-1">Budget ${(inquiry.budget_cents / 100).toFixed(0)}</p>
        )}
        {inquiry.message && <p className="text-sm mt-2">{inquiry.message}</p>}
        {isArtist && inquiry.status === "pending" && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => updateStatus.mutate({ id: inquiry.id, status: "confirmed" })}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: inquiry.id, status: "declined" })}>
              Decline
            </Button>
          </div>
        )}
      </Card>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message" onKeyDown={(e) => e.key === "Enter" && handleSend()} />
        <Button onClick={handleSend} disabled={send.isPending}>Send</Button>
      </div>
    </div>
  );
}
