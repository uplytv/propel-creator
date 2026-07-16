import { Fragment, useMemo, useState } from "react";
import {
  Plus, Mail, Clock, GitBranch, Zap, Users, Trash2, Pencil,
  CheckCircle2, AlertTriangle, ArrowDown, CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/email/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WORKFLOW_TRIGGERS, getTriggerMeta } from "./workflowTriggers";

/*
 * Visual workflow builder for drip sequences.
 *
 * STORAGE FORMAT IS UNCHANGED: steps remain a linear array of
 * drip_sequence_steps rows (step_number 1..N; subject/body/delay_hours;
 * optional condition_type/condition_value with numeric on_true_step /
 * on_false_step jumps). process-drip-sequences reads exactly that model —
 * this component is purely a rendering + editing layer on top of it:
 *
 *   - each row renders as (wait connector) → (condition fork, if any) → email card
 *   - on_true_step / on_false_step render as Yes/No lanes; a null (or
 *     self-referencing) target means "fall through to this row's email",
 *     matching the edge function's jump semantics
 *   - inserting a step between cards renumbers step_number and remaps all
 *     numeric jump targets so existing branches keep pointing at the same
 *     logical step
 */

export type DripStep = {
  id: string;
  sequence_id: string;
  step_number: number;
  subject: string;
  body: string;
  delay_hours: number;
  condition_type: string | null;
  condition_value: string | null;
  on_true_step: number | null;
  on_false_step: number | null;
};

export type DripSequenceRow = {
  id: string;
  name: string;
  status: string;
  trigger_event: string;
  trigger_tag: string | null;
};

interface StepFormValues {
  subject: string;
  body: string;
  delay_hours: number;
  condition_type: string | null;
  condition_value: string | null;
  on_true_step: number | null;
  on_false_step: number | null;
}

const DELAY_PRESETS = [0, 1, 6, 12, 24, 48, 72, 168];

function delayLabel(hours: number): string {
  if (hours === 0) return "Immediately";
  if (hours % 24 === 0) return hours === 24 ? "1 day" : `${hours / 24} days`;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const CONDITION_LABELS: Record<string, string> = {
  opened_previous: "opened a previous email",
  clicked_previous: "clicked a previous email",
  has_tag: "has tag",
};

/** null / self-referencing jumps fall through to this step's own email. */
function effectiveTarget(target: number | null, ownNumber: number): number | null {
  return target == null || target === ownNumber ? null : target;
}

// ── Connector pieces ─────────────────────────────────────────────

function Line({ h = "h-3" }: { h?: string }) {
  return <div className={`w-px ${h} bg-border`} />;
}

function Connector({
  waitHours,
  onWaitClick,
  onInsert,
  terminal,
}: {
  waitHours?: number;
  onWaitClick?: () => void;
  onInsert?: () => void;
  terminal?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <Line />
      {onInsert && (
        <>
          <button
            type="button"
            onClick={onInsert}
            aria-label="Add step here"
            className="w-6 h-6 border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/50 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <Line />
        </>
      )}
      {waitHours !== undefined && (
        <>
          <button
            type="button"
            onClick={onWaitClick}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-border bg-muted/60 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <Clock className="w-3 h-3" />
            {waitHours === 0 ? "Immediately" : `Wait ${delayLabel(waitHours)}`}
          </button>
          <Line />
        </>
      )}
      {!terminal && <ArrowDown className="w-3.5 h-3.5 text-border -mt-0.5" />}
    </div>
  );
}

// ── Condition fork (Yes / No lanes) ──────────────────────────────

function LaneChip({
  target,
  steps,
  yes,
}: {
  target: number | null;
  steps: DripStep[];
  yes: boolean;
}) {
  if (target == null) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowDown className="w-3 h-3 shrink-0" /> Send email below
      </span>
    );
  }
  const targetStep = steps.find(s => s.step_number === target);
  return (
    <span className={`flex items-center gap-1 text-[11px] ${yes ? "text-primary" : "text-foreground"}`}>
      <CornerDownRight className="w-3 h-3 shrink-0" />
      <span className="truncate">
        Skip to step {target}
        {targetStep?.subject ? ` · ${targetStep.subject}` : ""}
      </span>
    </span>
  );
}

function ConditionFork({ step, steps }: { step: DripStep; steps: DripStep[] }) {
  const conditionText =
    step.condition_type === "has_tag"
      ? `${CONDITION_LABELS.has_tag} "${step.condition_value || ""}"`
      : CONDITION_LABELS[step.condition_type || ""] || step.condition_type;
  const yesTarget = effectiveTarget(step.on_true_step, step.step_number);
  const noTarget = effectiveTarget(step.on_false_step, step.step_number);

  return (
    <div>
      <div className="border border-[#3D7CFF]/40 bg-[#3D7CFF]/5">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3D7CFF]/20">
          <div className="w-6 h-6 bg-[#3D7CFF]/10 text-[#3D7CFF] flex items-center justify-center shrink-0">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground">
            If subscriber {conditionText}
          </span>
        </div>
        <div className="grid grid-cols-2">
          <div className="p-2.5 border-r border-[#3D7CFF]/20 min-w-0">
            <div className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Yes</div>
            <LaneChip target={yesTarget} steps={steps} yes />
          </div>
          <div className="p-2.5 min-w-0">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">No</div>
            <LaneChip target={noTarget} steps={steps} yes={false} />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <Line h="h-2.5" />
      </div>
    </div>
  );
}

// ── Step editor form (used for inline edit + insert) ─────────────

function StepEditor({
  initial,
  targetOptions,
  onSave,
  onCancel,
  saving,
  saveLabel,
}: {
  initial: StepFormValues;
  /** Steps selectable as jump targets, with their (projected) numbers. */
  targetOptions: { number: number; subject: string }[];
  onSave: (values: StepFormValues) => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [delay, setDelay] = useState(initial.delay_hours);
  const [conditionType, setConditionType] = useState(initial.condition_type || "none");
  const [conditionValue, setConditionValue] = useState(initial.condition_value || "");
  const [onTrue, setOnTrue] = useState(initial.on_true_step != null ? String(initial.on_true_step) : "continue");
  const [onFalse, setOnFalse] = useState(initial.on_false_step != null ? String(initial.on_false_step) : "continue");

  const delayOptions = DELAY_PRESETS.includes(delay) ? DELAY_PRESETS : [...DELAY_PRESETS, delay].sort((a, b) => a - b);

  const save = () => {
    const hasCondition = conditionType !== "none";
    onSave({
      subject: subject.trim(),
      body,
      delay_hours: delay,
      condition_type: hasCondition ? conditionType : null,
      condition_value: hasCondition && conditionType === "has_tag" ? conditionValue.trim() || null : null,
      on_true_step: hasCondition && onTrue !== "continue" ? Number(onTrue) : null,
      on_false_step: hasCondition && onFalse !== "continue" ? Number(onFalse) : null,
    });
  };

  const branchSelect = (value: string, onChange: (v: string) => void, tone: "yes" | "no") => (
    <div className="min-w-0">
      <label className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 block ${tone === "yes" ? "text-primary" : "text-muted-foreground"}`}>
        {tone === "yes" ? "Yes →" : "No →"}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="continue">Send email below</SelectItem>
          {targetOptions.map(o => (
            <SelectItem key={o.number} value={String(o.number)}>
              Skip to step {o.number}{o.subject ? ` · ${o.subject.slice(0, 32)}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-3 p-4 border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Wait
        </label>
        <Select value={String(delay)} onValueChange={v => setDelay(Number(v))}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {delayOptions.map(h => (
              <SelectItem key={h} value={String(h)}>{delayLabel(h)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">before this step runs</span>
      </div>

      <div className="p-3 border border-[#3D7CFF]/30 bg-card space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-[#3D7CFF]" />
          <span className="text-xs font-medium text-muted-foreground">Condition (optional)</span>
        </div>
        <Select value={conditionType} onValueChange={setConditionType}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No condition — always send</SelectItem>
            <SelectItem value="opened_previous">Opened a previous email</SelectItem>
            <SelectItem value="clicked_previous">Clicked a previous email</SelectItem>
            <SelectItem value="has_tag">Has tag</SelectItem>
          </SelectContent>
        </Select>
        {conditionType === "has_tag" && (
          <Input
            value={conditionValue}
            onChange={e => setConditionValue(e.target.value)}
            placeholder="Tag name..."
            className="h-8 text-xs"
          />
        )}
        {conditionType !== "none" && (
          <div className="grid grid-cols-2 gap-2">
            {branchSelect(onTrue, setOnTrue, "yes")}
            {branchSelect(onFalse, setOnFalse, "no")}
          </div>
        )}
      </div>

      <Input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Email subject..."
      />
      <RichTextEditor value={body} onChange={setBody} placeholder="Email body..." />

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={save} disabled={!subject.trim() || saving} className="flex-1">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

function EndCard() {
  return (
    <div className="border border-dashed border-border bg-muted/30 px-3 py-2.5 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">End — enrollment completes</span>
    </div>
  );
}

// ── Main builder ─────────────────────────────────────────────────

export default function WorkflowBuilder({
  sequence,
  steps,
}: {
  sequence: DripSequenceRow;
  steps: DripStep[];
}) {
  const qc = useQueryClient();
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const ordered = useMemo(
    () => [...steps].sort((a, b) => a.step_number - b.step_number),
    [steps]
  );

  const { data: activeCount = 0 } = useQuery({
    queryKey: ["drip-active-count", sequence.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("drip_sequence_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("sequence_id", sequence.id)
        .eq("status", "active");
      return count || 0;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["drip-steps"] });
    qc.invalidateQueries({ queryKey: ["drip-sequences"] });
  };

  const updateTrigger = useMutation({
    mutationFn: async (triggerEvent: string) => {
      const { error } = await supabase
        .from("drip_sequences")
        .update({ trigger_event: triggerEvent, trigger_tag: null })
        .eq("id", sequence.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drip-sequences"] });
      toast.success("Trigger updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: StepFormValues }) => {
      const { error } = await supabase.from("drip_sequence_steps").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingStepId(null);
      invalidate();
      toast.success("Step updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /**
   * Insert a step at `position` (1-based). Shifts step_number of every step
   * at/after the position and remaps ALL numeric jump targets pointing
   * at/after it, so existing branches keep the same logical destination.
   * Updates run in descending step order (safe without a unique constraint,
   * deterministic with one).
   */
  const insertStep = useMutation({
    mutationFn: async ({ position, values }: { position: number; values: StepFormValues }) => {
      const shift = (n: number | null) => (n != null && n >= position ? n + 1 : n);
      const desc = [...ordered].sort((a, b) => b.step_number - a.step_number);
      for (const s of desc) {
        const newNum = s.step_number >= position ? s.step_number + 1 : s.step_number;
        const newTrue = shift(s.on_true_step);
        const newFalse = shift(s.on_false_step);
        if (newNum !== s.step_number || newTrue !== s.on_true_step || newFalse !== s.on_false_step) {
          const { error } = await supabase
            .from("drip_sequence_steps")
            .update({ step_number: newNum, on_true_step: newTrue, on_false_step: newFalse })
            .eq("id", s.id);
          if (error) throw error;
        }
      }
      const { error } = await supabase.from("drip_sequence_steps").insert({
        sequence_id: sequence.id,
        step_number: position,
        ...values,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setInsertAt(null);
      invalidate();
      toast.success("Step added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /**
   * Delete a step, close the gap in step_number, and remap jump targets:
   * targets pointing at the deleted step become null (fall through),
   * targets past it shift down by one.
   */
  const deleteStep = useMutation({
    mutationFn: async (step: DripStep) => {
      const { error: delErr } = await supabase.from("drip_sequence_steps").delete().eq("id", step.id);
      if (delErr) throw delErr;
      const k = step.step_number;
      const remap = (n: number | null) => (n == null ? null : n === k ? null : n > k ? n - 1 : n);
      const remaining = ordered.filter(s => s.id !== step.id).sort((a, b) => a.step_number - b.step_number);
      for (const s of remaining) {
        const newNum = s.step_number > k ? s.step_number - 1 : s.step_number;
        const newTrue = remap(s.on_true_step);
        const newFalse = remap(s.on_false_step);
        if (newNum !== s.step_number || newTrue !== s.on_true_step || newFalse !== s.on_false_step) {
          const { error } = await supabase
            .from("drip_sequence_steps")
            .update({ step_number: newNum, on_true_step: newTrue, on_false_step: newFalse })
            .eq("id", s.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Step removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /** Jump-target options with numbers as they will be AFTER inserting at `position`. */
  const insertTargetOptions = (position: number) =>
    ordered.map(s => ({
      number: s.step_number >= position ? s.step_number + 1 : s.step_number,
      subject: s.subject,
    }));

  const editTargetOptions = (step: DripStep) =>
    ordered.filter(s => s.id !== step.id).map(s => ({ number: s.step_number, subject: s.subject }));

  const triggerMeta = getTriggerMeta(sequence.trigger_event);
  const selectedTrigger = WORKFLOW_TRIGGERS.find(t => t.value === sequence.trigger_event);
  const TriggerIcon = triggerMeta.icon;
  const lastNumber = ordered.length > 0 ? ordered[ordered.length - 1].step_number : 0;

  const emptyStep: StepFormValues = {
    subject: "",
    body: "",
    delay_hours: 24,
    condition_type: null,
    condition_value: null,
    on_true_step: null,
    on_false_step: null,
  };

  const renderInsertEditor = (position: number) => (
    <StepEditor
      initial={emptyStep}
      targetOptions={insertTargetOptions(position)}
      saving={insertStep.isPending}
      saveLabel="Add step"
      onCancel={() => setInsertAt(null)}
      onSave={values => insertStep.mutate({ position, values })}
    />
  );

  const shortLine = <div className="flex flex-col items-center"><Line /></div>;

  return (
    <div>
      {/* Trigger card */}
      <div className="border border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 flex items-center justify-center text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #3D7CFF, #B025FF)" }}
            >
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trigger</span>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px] font-normal">
            <Users className="w-3 h-3" /> {activeCount} active enrollment{activeCount === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="p-3 space-y-2">
          <Select
            value={sequence.trigger_event}
            onValueChange={v => updateTrigger.mutate(v)}
            disabled={updateTrigger.isPending}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORKFLOW_TRIGGERS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
              {triggerMeta.legacy && (
                <SelectItem value={sequence.trigger_event} disabled>
                  {triggerMeta.label}
                  {sequence.trigger_tag ? ` (tag: ${sequence.trigger_tag})` : ""}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedTrigger ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <TriggerIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
              {selectedTrigger.description}
            </p>
          ) : (
            <p className="text-[11px] text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This trigger never auto-enrolls anyone. Pick a supported trigger above.
            </p>
          )}
        </div>
      </div>

      {/* Empty state */}
      {ordered.length === 0 && (
        insertAt !== null ? (
          <>
            {shortLine}
            {renderInsertEditor(1)}
            {shortLine}
            <EndCard />
          </>
        ) : (
          <>
            <Connector terminal />
            <Button variant="outline" onClick={() => setInsertAt(1)} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add first step
            </Button>
          </>
        )
      )}

      {/* Flow */}
      {ordered.map(step => {
        const editing = editingStepId === step.id;
        const yesTarget = effectiveTarget(step.on_true_step, step.step_number);
        const noTarget = effectiveTarget(step.on_false_step, step.step_number);
        const unreachable = !!step.condition_type && yesTarget != null && noTarget != null;
        const bodyPreview = stripHtml(step.body);

        return (
          <Fragment key={step.id}>
            {insertAt === step.step_number ? (
              <>
                {shortLine}
                {renderInsertEditor(step.step_number)}
                <Connector waitHours={step.delay_hours} />
              </>
            ) : (
              <Connector
                waitHours={step.delay_hours}
                onWaitClick={() => { setInsertAt(null); setEditingStepId(step.id); }}
                onInsert={insertAt === null && !editingStepId ? () => setInsertAt(step.step_number) : undefined}
              />
            )}

            {!editing && step.condition_type && <ConditionFork step={step} steps={ordered} />}

            {editing ? (
              <StepEditor
                initial={{
                  subject: step.subject,
                  body: step.body,
                  delay_hours: step.delay_hours,
                  condition_type: step.condition_type,
                  condition_value: step.condition_value,
                  on_true_step: effectiveTarget(step.on_true_step, step.step_number),
                  on_false_step: effectiveTarget(step.on_false_step, step.step_number),
                }}
                targetOptions={editTargetOptions(step)}
                saving={updateStep.isPending}
                saveLabel="Save step"
                onCancel={() => setEditingStepId(null)}
                onSave={values => updateStep.mutate({ id: step.id, values })}
              />
            ) : (
              <div className={`border bg-card ${unreachable ? "border-amber-500/50" : "border-border"}`}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                      Step {step.step_number} · Email
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setInsertAt(null); setEditingStepId(step.id); }}
                      aria-label={`Edit step ${step.step_number}`}
                      className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this step? Branch jumps pointing here will fall through.")) {
                          deleteStep.mutate(step);
                        }
                      }}
                      aria-label={`Delete step ${step.step_number}`}
                      className="p-1.5 text-destructive/60 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2.5 space-y-1">
                  <p className="text-sm font-medium text-foreground truncate">{step.subject || "No subject"}</p>
                  {bodyPreview && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{bodyPreview}</p>
                  )}
                  {unreachable && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Both branches skip elsewhere — this email never sends.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}

      {/* End of flow */}
      {ordered.length > 0 && (
        <>
          {insertAt === lastNumber + 1 ? (
            <>
              {shortLine}
              {renderInsertEditor(lastNumber + 1)}
              {shortLine}
            </>
          ) : (
            <Connector
              onInsert={insertAt === null && !editingStepId ? () => setInsertAt(lastNumber + 1) : undefined}
              terminal
            />
          )}
          <EndCard />
        </>
      )}
    </div>
  );
}
