import { useState } from "react";
import { Send, Mail, Users, Loader2, Check, AlertCircle, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusBadge: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground", label: "Draft" },
  sending: { color: "bg-yellow-500/10 text-yellow-400", label: "Sending" },
  sent: { color: "bg-primary/10 text-primary", label: "Sent" },
  failed: { color: "bg-destructive/10 text-destructive", label: "Failed" },
};

export default function EmailBroadcast() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [confirmSend, setConfirmSend] = useState(false);
  const [composing, setComposing] = useState(false);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["email-broadcasts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_broadcasts")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: subCount = 0 } = useQuery({
    queryKey: ["subscriber-count-for-broadcast", user?.id, segment],
    queryFn: async () => {
      let query = supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user!.id)
        .eq("unsubscribed", false);

      if (segment === "members") {
        query = query.eq("source", "membership");
      } else if (segment === "free") {
        query = query.neq("source", "membership");
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Create broadcast record
      const { data: broadcast, error: insertErr } = await supabase
        .from("email_broadcasts")
        .insert({
          creator_id: user!.id,
          subject,
          body,
          segment,
          status: "sending",
          total_recipients: subCount,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Fetch recipients
      let query = supabase
        .from("subscribers")
        .select("email, name")
        .eq("creator_id", user!.id)
        .eq("unsubscribed", false);

      if (segment === "members") query = query.eq("source", "membership");
      else if (segment === "free") query = query.neq("source", "membership");

      const { data: recipients } = await query;
      if (!recipients?.length) throw new Error("No recipients found");

      // Send via edge function (uses existing email infra)
      const { error: sendErr } = await supabase.functions.invoke("send-email-broadcast", {
        body: {
          broadcastId: broadcast.id,
          subject,
          htmlBody: body,
          recipients: recipients.map(r => ({ email: r.email, name: r.name })),
          creatorName: profile?.display_name || "Creator",
          creatorAvatar: profile?.avatar_url,
        },
      });

      if (sendErr) throw sendErr;
    },
    onSuccess: () => {
      toast.success("Broadcast sent!");
      setComposing(false);
      setSubject("");
      setBody("");
      setConfirmSend(false);
      qc.invalidateQueries({ queryKey: ["email-broadcasts"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send broadcast");
    },
  });

  return (
    <AppLayout>
      <SEOHead title="Email Broadcast | UPLY" description="Send emails to your subscribers" />
      <div className="min-h-screen pb-24">
        <BackNav label="Email Broadcast" />

        {composing ? (
          <div className="px-4 space-y-4">
            <button onClick={() => setComposing(false)} className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to broadcasts
            </button>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Send to</label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="members">Members Only</SelectItem>
                    <SelectItem value="free">Free Subscribers</SelectItem>
                    <SelectItem value="stream_join">Stream Viewers</SelectItem>
                    <SelectItem value="rsvp">Event RSVPs</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{subCount} recipient{subCount !== 1 ? "s" : ""}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject line..."
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your email content..."
                  rows={10}
                  className="rounded-xl"
                />
              </div>

              <Button
                onClick={() => setConfirmSend(true)}
                disabled={!subject.trim() || !body.trim() || subCount === 0}
                className="w-full rounded-xl gap-2"
                style={{ background: "#00FF85", color: "#0A0A0A" }}
              >
                <Send className="w-4 h-4" /> Send to {subCount} subscriber{subCount !== 1 ? "s" : ""}
              </Button>
            </div>

            <Dialog open={confirmSend} onOpenChange={setConfirmSend}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Send</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Send "<strong>{subject}</strong>" to <strong>{subCount}</strong> subscribers?
                </p>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setConfirmSend(false)}>Cancel</Button>
                  <Button
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    style={{ background: "#00FF85", color: "#0A0A0A" }}
                  >
                    {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Now"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="px-4 space-y-4">
            <Button onClick={() => setComposing(true)} className="w-full rounded-xl gap-2" style={{ background: "#00FF85", color: "#0A0A0A" }}>
              <Mail className="w-4 h-4" /> New Broadcast
            </Button>

            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : broadcasts.length === 0 ? (
              <div className="text-center py-16">
                <Send className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No broadcasts yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create your first email broadcast</p>
              </div>
            ) : (
              broadcasts.map((b: any) => {
                const status = statusBadge[b.status] || statusBadge.draft;
                return (
                  <div key={b.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground truncate">{b.subject}</h3>
                      <Badge className={`${status.color} text-[10px]`}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span><Users className="w-3 h-3 inline mr-1" />{b.total_recipients || 0} recipients</span>
                      {b.delivered_count > 0 && <span><Check className="w-3 h-3 inline mr-1" />{b.delivered_count} delivered</span>}
                      {b.failed_count > 0 && <span><AlertCircle className="w-3 h-3 inline mr-1" />{b.failed_count} failed</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {b.sent_at ? format(new Date(b.sent_at), "MMM d, yyyy h:mm a") : format(new Date(b.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
