import { useState } from "react";
import { Plus, Play, Pause, Trash2, ArrowLeft, Users, Zap, ChevronRight } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DripAnalytics from "@/components/drip/DripAnalytics";
import WorkflowBuilder from "@/components/drip/WorkflowBuilder";
import { WORKFLOW_TRIGGERS, triggerLabel } from "@/components/drip/workflowTriggers";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function DripSequences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingSeq, setEditingSeq] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("Welcome Sequence");
  const [newTrigger, setNewTrigger] = useState("new_subscriber");

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["drip-sequences", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("drip_sequences")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: steps = [] } = useQuery({
    queryKey: ["drip-steps", editingSeq],
    queryFn: async () => {
      const { data } = await supabase
        .from("drip_sequence_steps")
        .select("*")
        .eq("sequence_id", editingSeq!)
        .order("step_number", { ascending: true });
      return data || [];
    },
    enabled: !!editingSeq,
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ["drip-enrollment-counts", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("drip_sequence_enrollments")
        .select("sequence_id, status")
        .in("sequence_id", sequences.map(s => s.id));
      const counts: Record<string, { active: number; completed: number }> = {};
      (data || []).forEach((e: any) => {
        if (!counts[e.sequence_id]) counts[e.sequence_id] = { active: 0, completed: 0 };
        if (e.status === "active") counts[e.sequence_id].active++;
        else if (e.status === "completed") counts[e.sequence_id].completed++;
      });
      return counts;
    },
    enabled: sequences.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("drip_sequences").insert({
        creator_id: user!.id,
        name: newName,
        trigger_event: newTrigger,
        trigger_tag: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sequence created");
      setShowCreate(false);
      setNewName("Welcome Sequence");
      setNewTrigger("new_subscriber");
      qc.invalidateQueries({ queryKey: ["drip-sequences"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const { error } = await supabase
        .from("drip_sequences")
        .update({ status: current === "active" ? "paused" : "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drip-sequences"] });
      toast.success("Sequence updated");
    },
  });

  const deleteSeq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drip_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drip-sequences"] });
      toast.success("Sequence deleted");
      if (editingSeq) setEditingSeq(null);
    },
  });

  if (editingSeq) {
    const seq = sequences.find(s => s.id === editingSeq);
    const ec = enrollmentCounts[editingSeq] || { active: 0, completed: 0 };
    return (
      <AppLayout>
        <SEOHead title="Edit Sequence | UPLY" />
        <div className="min-h-screen pb-24">
          <BackNav label={seq?.name || "Sequence"} />
          <div className="px-4 space-y-4">
            <button onClick={() => setEditingSeq(null)} className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to sequences
            </button>

            <div className="p-4 border border-border bg-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">{seq?.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                    <Users className="w-3 h-3" /> {ec.active} active
                  </Badge>
                  <Badge className={seq?.status === "active" ? "bg-primary/10 text-primary text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                    {seq?.status === "active" ? "Active" : "Paused"}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Automated workflow · {steps.length} step{steps.length === 1 ? "" : "s"}
              </p>
            </div>

            {/* Visual workflow */}
            {seq ? (
              <WorkflowBuilder sequence={seq} steps={steps} />
            ) : (
              <Skeleton className="h-40" />
            )}

            {/* Analytics */}
            <DripAnalytics sequenceId={editingSeq} steps={steps} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead title="Drip Sequences | UPLY" description="Automated email workflows" />
      <div className="min-h-screen pb-24">
        <BackNav label="Drip Sequences" />

        <div className="px-4 space-y-4">
          <Button onClick={() => setShowCreate(true)} className="w-full gap-2">
            <Plus className="w-4 h-4" /> New Sequence
          </Button>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : sequences.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No sequences yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create automated email workflows for new subscribers</p>
            </div>
          ) : (
            sequences.map(seq => {
              const ec = enrollmentCounts[seq.id] || { active: 0, completed: 0 };
              return (
                <div
                  key={seq.id}
                  className="p-4 border border-border bg-card space-y-2 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setEditingSeq(seq.id)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">{seq.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={seq.status === "active" ? "bg-primary/10 text-primary text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                        {seq.status === "active" ? "Active" : "Paused"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span><Zap className="w-3 h-3 inline mr-0.5" />{triggerLabel(seq.trigger_event, seq.trigger_tag)}</span>
                    <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                      <Users className="w-3 h-3" /> {ec.active} active
                    </Badge>
                    <span>{ec.completed} completed</span>
                  </div>
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => toggleStatus.mutate({ id: seq.id, current: seq.status })}
                    >
                      {seq.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {seq.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive/60 hover:text-destructive gap-1"
                      onClick={() => { if (confirm("Delete this sequence?")) deleteSeq.mutate(seq.id); }}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Drip Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Trigger</label>
                <Select value={newTrigger} onValueChange={setNewTrigger}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_TRIGGERS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {WORKFLOW_TRIGGERS.find(t => t.value === newTrigger)?.description}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
