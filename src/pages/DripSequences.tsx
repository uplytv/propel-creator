import { useState } from "react";
import { Plus, Play, Pause, Trash2, Mail, Clock, ArrowLeft, Users, Zap, ChevronRight, GitBranch, BarChart3 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import RichTextEditor from "@/components/email/RichTextEditor";
import DripAnalytics from "@/components/drip/DripAnalytics";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const triggerLabels: Record<string, string> = {
  new_subscriber: "New Subscriber",
  tag_added: "Tag Added",
  rsvp: "Event RSVP",
};

export default function DripSequences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editingSeq, setEditingSeq] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("Welcome Sequence");
  const [newTrigger, setNewTrigger] = useState("new_subscriber");
  const [newTriggerTag, setNewTriggerTag] = useState("");

  // Adding step
  const [addingStep, setAddingStep] = useState(false);
  const [stepSubject, setStepSubject] = useState("");
  const [stepBody, setStepBody] = useState("");
  const [stepDelay, setStepDelay] = useState(24);
  const [stepConditionType, setStepConditionType] = useState<string>("");
  const [stepConditionValue, setStepConditionValue] = useState("");
  const [stepOnTrueStep, setStepOnTrueStep] = useState<number | null>(null);
  const [stepOnFalseStep, setStepOnFalseStep] = useState<number | null>(null);

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
        trigger_tag: newTrigger === "tag_added" ? newTriggerTag : null,
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

  const addStep = useMutation({
    mutationFn: async () => {
      const nextNum = steps.length + 1;
      const { error } = await supabase.from("drip_sequence_steps").insert({
        sequence_id: editingSeq!,
        step_number: nextNum,
        subject: stepSubject,
        body: stepBody,
        delay_hours: stepDelay,
        condition_type: stepConditionType || null,
        condition_value: stepConditionValue || null,
        on_true_step: stepOnTrueStep,
        on_false_step: stepOnFalseStep,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Step added");
      setAddingStep(false);
      setStepSubject("");
      setStepBody("");
      setStepDelay(24);
      setStepConditionType("");
      setStepConditionValue("");
      setStepOnTrueStep(null);
      setStepOnFalseStep(null);
      qc.invalidateQueries({ queryKey: ["drip-steps"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drip_sequence_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drip-steps"] });
      toast.success("Step removed");
    },
  });

  if (editingSeq) {
    const seq = sequences.find(s => s.id === editingSeq);
    return (
      <AppLayout>
        <SEOHead title="Edit Sequence | UPLY" />
        <div className="min-h-screen pb-24">
          <BackNav label={seq?.name || "Sequence"} />
          <div className="px-4 space-y-4">
            <button onClick={() => setEditingSeq(null)} className="flex items-center gap-1 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to sequences
            </button>

            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">{seq?.name}</h3>
                <Badge className={seq?.status === "active" ? "bg-primary/10 text-primary text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                  {seq?.status === "active" ? "Active" : "Paused"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Trigger: {triggerLabels[seq?.trigger_event || ""] || seq?.trigger_event}
                {seq?.trigger_tag && ` (tag: ${seq.trigger_tag})`}
              </p>
            </div>

            {/* Analytics */}
            <DripAnalytics sequenceId={editingSeq} steps={steps} />

            <h3 className="text-sm font-semibold text-foreground">Steps ({steps.length})</h3>

            {steps.map((step, i) => (
              <div key={step.id} className="p-3 rounded-xl border border-border bg-card space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{step.step_number}</div>
                    <span className="text-sm font-medium text-foreground truncate">{step.subject || "No subject"}</span>
                  </div>
                  <button onClick={() => deleteStep.mutate(step.id)} className="text-destructive/60 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-8">
                  <Clock className="w-3 h-3" />
                  {i === 0 ? `${step.delay_hours}h after enrollment` : `${step.delay_hours}h after step ${step.step_number - 1}`}
                </div>
                {step.condition_type && (
                  <div className="flex items-center gap-2 text-[10px] pl-8 text-purple-400">
                    <GitBranch className="w-3 h-3" />
                    If {step.condition_type === "opened_previous" ? "opened previous email" : step.condition_type === "clicked_previous" ? "clicked previous email" : `has tag "${step.condition_value}"`}
                    {step.on_true_step && <span className="text-primary">→ step {step.on_true_step}</span>}
                    {step.on_false_step && <span className="text-muted-foreground">else → step {step.on_false_step}</span>}
                  </div>
                )}
              </div>
            ))}

            {addingStep ? (
              <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <Input
                  value={stepSubject}
                  onChange={e => setStepSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="rounded-xl"
                />
                <RichTextEditor value={stepBody} onChange={setStepBody} placeholder="Email body..." />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Delay:</label>
                  <Select value={stepDelay.toString()} onValueChange={v => setStepDelay(Number(v))}>
                    <SelectTrigger className="w-32 h-8 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Immediately</SelectItem>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="24">1 day</SelectItem>
                      <SelectItem value="48">2 days</SelectItem>
                      <SelectItem value="72">3 days</SelectItem>
                      <SelectItem value="168">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Branching condition */}
                <div className="p-3 rounded-xl border border-border bg-card/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-muted-foreground">Branching (optional)</span>
                  </div>
                  <Select value={stepConditionType} onValueChange={setStepConditionType}>
                    <SelectTrigger className="h-8 rounded-lg text-xs">
                      <SelectValue placeholder="No condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No condition</SelectItem>
                      <SelectItem value="opened_previous">Opened previous email</SelectItem>
                      <SelectItem value="clicked_previous">Clicked previous email</SelectItem>
                      <SelectItem value="has_tag">Has tag</SelectItem>
                    </SelectContent>
                  </Select>
                  {stepConditionType === "has_tag" && (
                    <Input
                      value={stepConditionValue}
                      onChange={e => setStepConditionValue(e.target.value)}
                      placeholder="Tag name..."
                      className="h-8 text-xs rounded-lg"
                    />
                  )}
                  {stepConditionType && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-primary mb-0.5 block">If TRUE → go to step</label>
                        <Input
                          type="number"
                          min={1}
                          value={stepOnTrueStep ?? ""}
                          onChange={e => setStepOnTrueStep(e.target.value ? Number(e.target.value) : null)}
                          className="h-7 text-xs rounded-lg"
                          placeholder="Next"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">If FALSE → go to step</label>
                        <Input
                          type="number"
                          min={1}
                          value={stepOnFalseStep ?? ""}
                          onChange={e => setStepOnFalseStep(e.target.value ? Number(e.target.value) : null)}
                          className="h-7 text-xs rounded-lg"
                          placeholder="Next"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setAddingStep(false)} className="rounded-xl flex-1">Cancel</Button>
                  <Button
                    onClick={() => addStep.mutate()}
                    disabled={!stepSubject.trim() || addStep.isPending}
                    className="rounded-xl flex-1"
                    style={{ background: "#3D7CFF", color: "#0A0A0A" }}
                  >
                    Add Step
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setAddingStep(true)} className="w-full rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Add Step
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead title="Drip Sequences | UPLY" description="Automated email sequences" />
      <div className="min-h-screen pb-24">
        <BackNav label="Drip Sequences" />

        <div className="px-4 space-y-4">
          <Button onClick={() => setShowCreate(true)} className="w-full rounded-xl gap-2" style={{ background: "#3D7CFF", color: "#0A0A0A" }}>
            <Plus className="w-4 h-4" /> New Sequence
          </Button>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : sequences.length === 0 ? (
            <div className="text-center py-16">
              <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No sequences yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create automated email sequences for new subscribers</p>
            </div>
          ) : (
            sequences.map(seq => {
              const ec = enrollmentCounts[seq.id] || { active: 0, completed: 0 };
              return (
                <div
                  key={seq.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-2 cursor-pointer hover:border-primary/30 transition-colors"
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span><Zap className="w-3 h-3 inline mr-0.5" />{triggerLabels[seq.trigger_event] || seq.trigger_event}</span>
                    <span><Users className="w-3 h-3 inline mr-0.5" />{ec.active} active</span>
                    <span>{ec.completed} completed</span>
                  </div>
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs rounded-lg gap-1"
                      onClick={() => toggleStatus.mutate({ id: seq.id, current: seq.status })}
                    >
                      {seq.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {seq.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs rounded-lg text-destructive/60 hover:text-destructive gap-1"
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
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Trigger</label>
                <Select value={newTrigger} onValueChange={setNewTrigger}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_subscriber">New Subscriber</SelectItem>
                    <SelectItem value="tag_added">Tag Added</SelectItem>
                    <SelectItem value="rsvp">Event RSVP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newTrigger === "tag_added" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tag</label>
                  <Input value={newTriggerTag} onChange={e => setNewTriggerTag(e.target.value)} placeholder="e.g. vip" className="rounded-xl" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                style={{ background: "#3D7CFF", color: "#0A0A0A" }}
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
