import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";

export default function BrandDeal() {
  const { dealId } = useParams<{ dealId: string }>();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: deal } = useQuery({
    queryKey: ["brand-deal", dealId],
    queryFn: async () => {
      const { data } = await supabase.from("brand_deals").select("*, brand_profiles(*), brand_campaigns(*)").eq("id", dealId!).single();
      return data;
    },
    enabled: !!dealId,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["deal-messages", dealId],
    queryFn: async () => {
      const { data } = await supabase.from("deal_messages").select("*, profiles:sender_id(display_name, avatar_url)").eq("deal_id", dealId!).order("created_at");
      return data || [];
    },
    enabled: !!dealId,
  });

  // Realtime messages
  useEffect(() => {
    if (!dealId) return;
    const channel = supabase.channel(`deal-messages-${dealId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "deal_messages", filter: `deal_id=eq.${dealId}` }, () => refetchMessages()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealId, refetchMessages]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile");
      const { error } = await supabase.from("deal_messages").insert({ deal_id: dealId!, sender_id: profile.id, message });
      if (error) throw error;
    },
    onSuccess: () => { setMessage(""); refetchMessages(); },
  });

  if (!deal) return <AppLayout><div className="p-4"><BackNav label="Deal" /><div className="skeleton h-48 mt-4 rounded-xl" /></div></AppLayout>;

  return (
    <AppLayout>
      <SEOHead title="Brand Deal" description="Manage your brand deal" />
      <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Brand Deal" />
        <Card className="mt-4 border-border"><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">{deal.brand_campaigns?.title || "Deal"}</h2>
            <Badge>{deal.status}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center border-t border-border pt-3">
            <div><p className="text-xs text-muted-foreground">Agreed Rate</p><p className="font-bold text-primary">${deal.agreed_rate}</p></div>
            <div><p className="text-xs text-muted-foreground">UPLY Fee</p><p className="font-bold">{deal.uply_fee_percentage}%</p></div>
            <div><p className="text-xs text-muted-foreground">Your Payout</p><p className="font-bold text-primary">${deal.creator_payout_amount}</p></div>
          </div>
          <div className="mt-3"><p className="text-xs text-muted-foreground">Deliverables</p><p className="text-sm">{deal.deliverables}</p></div>
        </CardContent></Card>

        <Card className="mt-4 border-border"><CardHeader className="pb-2"><CardTitle className="text-base">Messages</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {messages.map((msg: any) => {
              const isMine = msg.sender_id === profile?.id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                  <Avatar className="w-7 h-7 shrink-0"><AvatarImage src={msg.profiles?.avatar_url} /><AvatarFallback className="text-[10px]">{(msg.profiles?.display_name || "?")[0]}</AvatarFallback></Avatar>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isMine ? "bg-primary/10" : "bg-card border border-border"}`}>
                    <p>{msg.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(msg.created_at), "h:mm a")}</p>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>}
          </CardContent>
          <div className="p-4 pt-0 flex gap-2">
            <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && !e.shiftKey && message.trim() && sendMut.mutate()} />
            <Button onClick={() => sendMut.mutate()} disabled={!message.trim() || sendMut.isPending} size="sm">
              {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
