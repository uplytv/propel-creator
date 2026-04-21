import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Sparkles, History, Save, Loader2, RotateCcw, Bookmark, Wand2, ArrowUp, ArrowDown, LayoutTemplate } from "lucide-react";
import { useGrowthPlan, type EditablePlan, type PlanVersion } from "@/hooks/useGrowthPlan";
import { useApp } from "@/context/AppContext";
import { GROWTH_PLAN_TEMPLATES } from "@/lib/growthPlanTemplates";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type SuggestField = "task" | "milestone" | "next_action" | "title";

export default function GrowthPlanEditor({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void; }) {
  const { plan, versions, loading, saving, save, restoreVersion, fetchSuggestions } = useGrowthPlan();
  const [draft, setDraft] = useState<EditablePlan | null>(null);
  const [suggestField, setSuggestField] = useState<SuggestField | null>(null);
  const [suggestTarget, setSuggestTarget] = useState<{ index?: number; current?: string } | null>(null);
  const [suggestions, setSuggestions] = useState<{ text: string; reason: string }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [versionNameInput, setVersionNameInput] = useState("");

  useEffect(() => { if (plan) setDraft(plan); }, [plan]);

  if (!open) return null;
  if (loading || !draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const update = (patch: Partial<EditablePlan>) => setDraft({ ...draft, ...patch });

  const askAi = async (field: SuggestField, opts: { index?: number; current?: string; siblings?: string[] }) => {
    setSuggestField(field);
    setSuggestTarget({ index: opts.index, current: opts.current });
    setSuggestions([]);
    setSuggestLoading(true);
    try {
      const sugg = await fetchSuggestions(field, opts.current, opts.siblings);
      setSuggestions(sugg);
    } catch { /* toast handled */ }
    finally { setSuggestLoading(false); }
  };

  const applySuggestion = (text: string) => {
    if (!suggestField || !draft) return;
    if (suggestField === "title") {
      update({ title: text });
    } else if (suggestField === "task") {
      const idx = suggestTarget?.index;
      if (idx == null) {
        update({ weeklyTasks: [...draft.weeklyTasks, { id: crypto.randomUUID(), title: text, description: "", recurDays: 7, hour: 10 }] });
      } else {
        const next = [...draft.weeklyTasks];
        next[idx] = { ...next[idx], title: text };
        update({ weeklyTasks: next });
      }
    } else if (suggestField === "milestone") {
      const idx = suggestTarget?.index;
      if (idx == null) {
        const d = new Date(); d.setDate(d.getDate() + 30);
        update({ milestones: [...draft.milestones, { id: crypto.randomUUID(), title: text, description: "", date: d.toISOString().slice(0, 10), hour: 12 }] });
      } else {
        const next = [...draft.milestones];
        next[idx] = { ...next[idx], title: text };
        update({ milestones: next });
      }
    } else if (suggestField === "next_action") {
      const idx = suggestTarget?.index;
      if (idx == null) {
        update({ nextActions: [...draft.nextActions, { title: text, reason: "" }] });
      } else {
        const next = [...draft.nextActions];
        next[idx] = { ...next[idx], title: text };
        update({ nextActions: next });
      }
    }
    setSuggestField(null);
    setSuggestions([]);
    toast.success("Applied");
  };

  const handleSave = async (versionName?: string) => {
    const result = await save(draft, { snapshot: true, versionName });
    if (result) toast.success(versionName ? `Saved as "${versionName}"` : "Plan saved");
    setVersionNameInput("");
  };

  const move = <T,>(arr: T[], from: number, dir: -1 | 1): T[] => {
    const to = from + dir;
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>Edit growth plan</DialogTitle>
          </div>
          <DialogDescription>Real-time AI suggestions, version history, and one-click sync.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="edit" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 mx-5 mt-3">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="suggest" className="gap-1.5"><Wand2 className="w-3.5 h-3.5" /> AI</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" /> History</TabsTrigger>
          </TabsList>

          {/* EDIT */}
          <TabsContent value="edit" className="flex-1 min-h-0 overflow-hidden m-0">
            <ScrollArea className="h-[55vh] px-5 py-4">
              <div className="space-y-5">
                {/* Title + duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">Plan title</Label>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => askAi("title", { current: draft.title })}>
                      <Sparkles className="w-3 h-3" /> Suggest
                    </Button>
                  </div>
                  <Input id="title" value={draft.title} onChange={(e) => update({ title: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input type="number" min={7} max={365} value={draft.durationDays} onChange={(e) => update({ durationDays: Math.max(7, +e.target.value || 30) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target MRR ($)</Label>
                    <Input type="number" min={0} value={draft.targetKpis.mrr} onChange={(e) => update({ targetKpis: { ...draft.targetKpis, mrr: +e.target.value || 0 } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target members</Label>
                    <Input type="number" min={0} value={draft.targetKpis.members} onChange={(e) => update({ targetKpis: { ...draft.targetKpis, members: +e.target.value || 0 } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target tier</Label>
                    <Input type="number" min={1} max={4} value={draft.targetKpis.tier} onChange={(e) => update({ targetKpis: { ...draft.targetKpis, tier: Math.min(4, Math.max(1, +e.target.value || 1)) } })} />
                  </div>
                </div>

                <Separator />

                {/* Weekly tasks */}
                <Section
                  title="Weekly habits"
                  onAdd={() => update({ weeklyTasks: [...draft.weeklyTasks, { id: crypto.randomUUID(), title: "New habit", description: "", recurDays: 7, hour: 10 }] })}
                  onSuggest={() => askAi("task", { siblings: draft.weeklyTasks.map(t => t.title) })}
                >
                  {draft.weeklyTasks.map((t, i) => (
                    <ItemRow
                      key={t.id}
                      title={t.title}
                      description={t.description}
                      meta={t.recurDays === 1 ? "Daily" : t.recurDays === 7 ? "Weekly" : "Once"}
                      onTitle={(v) => { const n = [...draft.weeklyTasks]; n[i] = { ...n[i], title: v }; update({ weeklyTasks: n }); }}
                      onDesc={(v) => { const n = [...draft.weeklyTasks]; n[i] = { ...n[i], description: v }; update({ weeklyTasks: n }); }}
                      onDelete={() => update({ weeklyTasks: draft.weeklyTasks.filter((_, j) => j !== i) })}
                      onUp={() => update({ weeklyTasks: move(draft.weeklyTasks, i, -1) })}
                      onDown={() => update({ weeklyTasks: move(draft.weeklyTasks, i, 1) })}
                      onSuggest={() => askAi("task", { index: i, current: t.title, siblings: draft.weeklyTasks.filter((_, j) => j !== i).map(x => x.title) })}
                    />
                  ))}
                </Section>

                <Separator />

                {/* Milestones */}
                <Section
                  title="Milestones"
                  onAdd={() => {
                    const d = new Date(); d.setDate(d.getDate() + 30);
                    update({ milestones: [...draft.milestones, { id: crypto.randomUUID(), title: "New milestone", description: "", date: d.toISOString().slice(0, 10), hour: 12 }] });
                  }}
                  onSuggest={() => askAi("milestone", { siblings: draft.milestones.map(m => m.title) })}
                >
                  {draft.milestones.map((m, i) => (
                    <div key={m.id} className="space-y-2">
                      <ItemRow
                        title={m.title}
                        description={m.description}
                        meta={m.date}
                        onTitle={(v) => { const n = [...draft.milestones]; n[i] = { ...n[i], title: v }; update({ milestones: n }); }}
                        onDesc={(v) => { const n = [...draft.milestones]; n[i] = { ...n[i], description: v }; update({ milestones: n }); }}
                        onDelete={() => update({ milestones: draft.milestones.filter((_, j) => j !== i) })}
                        onUp={() => update({ milestones: move(draft.milestones, i, -1) })}
                        onDown={() => update({ milestones: move(draft.milestones, i, 1) })}
                        onSuggest={() => askAi("milestone", { index: i, current: m.title, siblings: draft.milestones.filter((_, j) => j !== i).map(x => x.title) })}
                      />
                      <Input type="date" value={m.date ?? ""} onChange={(e) => { const n = [...draft.milestones]; n[i] = { ...n[i], date: e.target.value }; update({ milestones: n }); }} className="h-8 text-xs" />
                    </div>
                  ))}
                </Section>

                <Separator />

                {/* Next actions */}
                <Section
                  title="Next 3 actions"
                  onAdd={() => update({ nextActions: [...draft.nextActions, { title: "New action", reason: "" }] })}
                  onSuggest={() => askAi("next_action", { siblings: draft.nextActions.map(a => a.title) })}
                >
                  {draft.nextActions.map((a, i) => (
                    <ItemRow
                      key={i}
                      title={a.title}
                      description={a.reason}
                      descLabel="Why"
                      onTitle={(v) => { const n = [...draft.nextActions]; n[i] = { ...n[i], title: v }; update({ nextActions: n }); }}
                      onDesc={(v) => { const n = [...draft.nextActions]; n[i] = { ...n[i], reason: v }; update({ nextActions: n }); }}
                      onDelete={() => update({ nextActions: draft.nextActions.filter((_, j) => j !== i) })}
                      onUp={() => update({ nextActions: move(draft.nextActions, i, -1) })}
                      onDown={() => update({ nextActions: move(draft.nextActions, i, 1) })}
                      onSuggest={() => askAi("next_action", { index: i, current: a.title, siblings: draft.nextActions.filter((_, j) => j !== i).map(x => x.title) })}
                    />
                  ))}
                </Section>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI suggestions */}
          <TabsContent value="suggest" className="flex-1 min-h-0 overflow-hidden m-0">
            <ScrollArea className="h-[55vh] px-5 py-4">
              {!suggestField ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Wand2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  Click <strong>Suggest</strong> next to any field in the Edit tab to see 3 AI-generated alternatives here.
                </div>
              ) : suggestLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Suggestions for: {suggestField.replace("_", " ")}
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s.text)}
                      className="w-full text-left rounded-lg border border-border hover:border-primary/50 bg-card hover:bg-primary/5 p-3 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground mb-1">{s.text}</p>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="flex-1 min-h-0 overflow-hidden m-0">
            <ScrollArea className="h-[55vh] px-5 py-4">
              <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                <Label className="text-xs">Save a named milestone</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Q1 launch plan"
                    value={versionNameInput}
                    onChange={(e) => setVersionNameInput(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={!versionNameInput.trim() || saving}
                    onClick={() => handleSave(versionNameInput.trim())}
                    className="h-8 gap-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5" /> Pin
                  </Button>
                </div>
              </div>

              {versions.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No history yet. Versions are saved automatically each time you save your plan.
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => <VersionRow key={v.id} v={v} onRestore={() => restoreVersion(v)} />)}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          <Button size="sm" disabled={saving} onClick={() => handleSave()} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, onAdd, onSuggest, children }: { title: string; onAdd: () => void; onSuggest: () => void; children: React.ReactNode; }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onSuggest}><Sparkles className="w-3 h-3" /> Suggest</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onAdd}><Plus className="w-3 h-3" /> Add</Button>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ItemRow({ title, description, descLabel = "Description", meta, onTitle, onDesc, onDelete, onUp, onDown, onSuggest }: {
  title: string; description: string; descLabel?: string; meta?: string;
  onTitle: (v: string) => void; onDesc: (v: string) => void;
  onDelete: () => void; onUp: () => void; onDown: () => void; onSuggest: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2.5 space-y-2">
      <div className="flex items-start gap-1.5">
        <Input value={title} onChange={(e) => onTitle(e.target.value)} className="h-8 text-sm flex-1" />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onSuggest} title="AI suggest"><Sparkles className="w-3.5 h-3.5" /></Button>
      </div>
      <Textarea value={description} onChange={(e) => onDesc(e.target.value)} placeholder={descLabel} rows={2} className="text-xs resize-none" />
      <div className="flex items-center justify-between">
        {meta && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{meta}</span>}
        <div className="flex items-center gap-0.5 ml-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onUp}><ArrowUp className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDown}><ArrowDown className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
    </div>
  );
}

function VersionRow({ v, onRestore }: { v: PlanVersion; onRestore: () => void; }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {v.is_named_milestone && <Bookmark className="w-3 h-3 text-primary shrink-0" />}
          <p className="text-sm font-medium truncate">{v.version_name ?? "Auto-saved version"}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })} · {v.snapshot.weeklyTasks?.length ?? 0} habits · {v.snapshot.milestones?.length ?? 0} milestones
        </p>
      </div>
      <Button size="sm" variant="ghost" className="gap-1.5 shrink-0" onClick={onRestore}>
        <RotateCcw className="w-3.5 h-3.5" /> Restore
      </Button>
    </div>
  );
}
