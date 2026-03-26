import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, RotateCcw } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const statusBadge = (status: string) => {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-500/20 text-yellow-400", label: "Pending" },
    processing: { color: "bg-blue-500/20 text-blue-400", label: "Processing" },
    completed: { color: "bg-primary/20 text-primary", label: "Completed" },
    processed: { color: "bg-primary/20 text-primary", label: "Processed" },
    failed: { color: "bg-destructive/20 text-destructive", label: "Failed" },
  };
  const m = map[status] || { color: "bg-muted text-muted-foreground", label: status };
  return <Badge variant="outline" className={`${m.color} border-0 text-xs`}>{m.label}</Badge>;
};

function FailedWebhooksTab() {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState<string | null>(null);

  const { data: failedWebhooks = [], isLoading } = useQuery({
    queryKey: ["admin-failed-webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stripe_webhook_log")
        .select("*")
        .eq("status", "failed")
        .gte("attempts", 1)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleRetry = async (webhook: any) => {
    setRetrying(webhook.id);
    try {
      const { error } = await supabase.functions.invoke("stripe-webhook", {
        body: webhook.payload,
      });
      if (error) throw error;
      toast({ title: "Retry sent", description: "Webhook event re-processed." });
      queryClient.invalidateQueries({ queryKey: ["admin-failed-webhooks"] });
    } catch (err: any) {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    }
    setRetrying(null);
  };

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (failedWebhooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">No failed webhooks</h3>
        <p className="text-sm text-muted-foreground">All webhook events processed successfully.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-left">
            <th className="py-3 px-2">Event ID</th>
            <th className="py-3 px-2">Type</th>
            <th className="py-3 px-2">Attempts</th>
            <th className="py-3 px-2">Error</th>
            <th className="py-3 px-2">Created</th>
            <th className="py-3 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {failedWebhooks.map((w: any) => (
            <tr key={w.id} className="border-b border-border/50">
              <td className="py-3 px-2 font-mono text-xs max-w-[120px] truncate">{w.stripe_event_id}</td>
              <td className="py-3 px-2">
                <Badge variant="outline" className="text-xs">{w.event_type}</Badge>
              </td>
              <td className="py-3 px-2">
                <span className="text-destructive font-medium">{w.attempts}</span>
              </td>
              <td className="py-3 px-2 text-xs text-muted-foreground max-w-[200px] truncate">{w.error_message || "—"}</td>
              <td className="py-3 px-2 text-muted-foreground text-xs">{format(new Date(w.created_at), "MMM d, h:mm a")}</td>
              <td className="py-3 px-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleRetry(w)}
                  disabled={retrying === w.id}
                >
                  <RotateCcw className="w-3 h-3" />
                  {retrying === w.id ? "Retrying..." : "Retry"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPayouts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role" as any, { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!adminLoading && isAdmin === false) {
      toast({ title: "Access denied", variant: "destructive" });
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  const { data: pendingPayouts = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["admin-payouts-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .in("status", ["pending", "processing"])
        .order("requested_at", { ascending: true });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name || "Unknown"]));
      return (data || []).map((p: any) => ({ ...p, user_name: nameMap[p.user_id] || "Unknown" }));
    },
    enabled: isAdmin === true,
  });

  const { data: historyPayouts = [], isLoading: historyLoading } = useQuery({
    queryKey: ["admin-payouts-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .in("status", ["completed", "failed"])
        .order("processed_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name || "Unknown"]));
      return (data || []).map((p: any) => ({ ...p, user_name: nameMap[p.user_id] || "Unknown" }));
    },
    enabled: isAdmin === true,
  });

  const handleApprove = async (payout: any) => {
    setProcessing(payout.id);
    const { error } = await supabase
      .from("payout_requests")
      .update({ status: "processing", processed_at: new Date().toISOString() })
      .eq("id", payout.id);
    if (!error) {
      await supabase.from("job_notifications").insert({
        user_id: payout.user_id,
        type: "payout_approved",
        title: "Payout Processing",
        message: `Your payout of $${Number(payout.amount).toFixed(2)} is being processed and will arrive in 2–3 business days.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-pending"] });
      toast({ title: "Approved", description: "Payout marked as processing." });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  const handleReject = async (payout: any) => {
    if (!rejectReason.trim()) return;
    setProcessing(payout.id);
    const { error } = await supabase
      .from("payout_requests")
      .update({ status: "failed", notes: rejectReason, processed_at: new Date().toISOString() })
      .eq("id", payout.id);
    if (!error) {
      await supabase.from("job_notifications").insert({
        user_id: payout.user_id,
        type: "payout_rejected",
        title: "Payout Not Approved",
        message: `Your payout request of $${Number(payout.amount).toFixed(2)} was not approved: ${rejectReason}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payouts-history"] });
      setRejectingId(null);
      setRejectReason("");
      toast({ title: "Rejected", description: "Payout marked as failed." });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setProcessing(null);
  };

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Admin — Payout Management</h1>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="pending">Pending ({pendingPayouts.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="webhooks">Failed Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : pendingPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold">No pending payouts</h3>
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-2">User</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                      <th className="py-3 px-2">Method</th>
                      <th className="py-3 px-2">Requested</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayouts.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">{p.user_name}</td>
                        <td className="py-3 px-2 text-right font-medium">${Number(p.amount).toFixed(2)}</td>
                        <td className="py-3 px-2">{p.payout_method || "—"}</td>
                        <td className="py-3 px-2 text-muted-foreground">{format(new Date(p.requested_at), "MMM d, yyyy")}</td>
                        <td className="py-3 px-2">{statusBadge(p.status)}</td>
                        <td className="py-3 px-2">
                          {rejectingId === p.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Reason..."
                                className="h-8 text-xs w-40"
                              />
                              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => handleReject(p)} disabled={processing === p.id}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setRejectingId(null); setRejectReason(""); }}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleApprove(p)} disabled={processing === p.id}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setRejectingId(p.id)} disabled={processing === p.id}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {historyLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : historyPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Clock className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold">No history yet</h3>
                <p className="text-sm text-muted-foreground">Completed and failed payouts will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-left">
                      <th className="py-3 px-2">User</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                      <th className="py-3 px-2">Method</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Processed</th>
                      <th className="py-3 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPayouts.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-3 px-2 font-medium">{p.user_name}</td>
                        <td className="py-3 px-2 text-right font-medium">${Number(p.amount).toFixed(2)}</td>
                        <td className="py-3 px-2">{p.payout_method || "—"}</td>
                        <td className="py-3 px-2">{statusBadge(p.status)}</td>
                        <td className="py-3 px-2 text-muted-foreground">{p.processed_at ? format(new Date(p.processed_at), "MMM d, yyyy") : "—"}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{p.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhooks">
            <FailedWebhooksTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
