import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ClaimRow {
  id: string;
  business_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  note: string | null;
  status: string;
  created_at: string;
  business?: { username: string; business_name?: string };
}

export default function AdminClaimRequests() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-claim-requests"],
    queryFn: async () => {
      const { data: claims, error } = await supabase
        .from("claim_requests")
        .select("id, business_id, requester_name, requester_email, requester_phone, note, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const ids = Array.from(new Set(claims.map((c: any) => c.business_id)));
      const [{ data: profiles }, { data: details }] = await Promise.all([
        supabase.from("profiles").select("id, username").in("id", ids),
        supabase.from("business_details").select("profile_id, business_name").in("profile_id", ids),
      ]);
      const nameById = new Map((details ?? []).map((d: any) => [d.profile_id, d.business_name]));
      const userById = new Map((profiles ?? []).map((p: any) => [p.id, p.username]));
      return claims.map((c: any) => ({
        ...c,
        business: {
          username: userById.get(c.business_id) ?? "",
          business_name: nameById.get(c.business_id) ?? "",
        },
      })) as ClaimRow[];
    },
  });

  const decide = async (claimId: string, decision: "approve" | "reject") => {
    setBusy(claimId);
    try {
      const { data, error } = await supabase.functions.invoke("review-business-claim", {
        body: { claim_id: claimId, decision, reviewer_notes: notes[claimId] || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: `Claim ${decision}d` });
      qc.invalidateQueries({ queryKey: ["admin-claim-requests"] });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const pending = (data ?? []).filter((c) => c.status === "pending");
  const decided = (data ?? []).filter((c) => c.status !== "pending");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight">Business Claim Requests</h1>
        <p className="text-muted-foreground mt-1">Approve = transfer ownership + go live.</p>

        <h2 className="mt-8 text-xl font-bold">Pending ({pending.length})</h2>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin mt-4" />}
        <div className="grid gap-4 mt-4">
          {pending.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap gap-3 items-start justify-between">
                <div>
                  <Link to={`/${c.business?.username}`} target="_blank" className="font-bold text-lg hover:underline">
                    {c.business?.business_name || c.business?.username}
                  </Link>
                  <p className="text-sm text-muted-foreground">uply.tv/{c.business?.username}</p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/40">pending</Badge>
              </div>
              <div className="mt-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Requester:</span> {c.requester_name}</p>
                <p><span className="text-muted-foreground">Email:</span> {c.requester_email}</p>
                {c.requester_phone && <p><span className="text-muted-foreground">Phone:</span> {c.requester_phone}</p>}
                {c.note && <p className="mt-2 italic">"{c.note}"</p>}
              </div>
              <Textarea
                className="mt-3"
                placeholder="Reviewer notes (optional)"
                rows={2}
                value={notes[c.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
              />
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => decide(c.id, "approve")}
                  disabled={busy === c.id}
                  className="bg-[#6B5BFF] hover:bg-[#5b4bf0]"
                >
                  {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve & transfer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decide(c.id, "reject")}
                  disabled={busy === c.id}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
          {!isLoading && pending.length === 0 && (
            <p className="text-muted-foreground text-sm">No pending claims.</p>
          )}
        </div>

        <h2 className="mt-10 text-xl font-bold">Decided ({decided.length})</h2>
        <div className="grid gap-2 mt-3">
          {decided.map((c) => (
            <Card key={c.id} className="p-3 flex flex-wrap items-center gap-3 justify-between text-sm">
              <div>
                <Link to={`/${c.business?.username}`} className="font-semibold hover:underline">
                  {c.business?.business_name || c.business?.username}
                </Link>
                <span className="text-muted-foreground ml-2">{c.requester_email}</span>
              </div>
              <Badge className={c.status === "approved"
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-destructive/20 text-destructive border-destructive/40"}>
                {c.status}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
