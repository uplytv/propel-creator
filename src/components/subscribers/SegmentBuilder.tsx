import { useState } from "react";
import { Filter, Plus, X, Flame, Eye, MousePointerClick, Tag, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export interface SegmentRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (rules: SegmentRule[]) => void;
  availableTags: string[];
}

const fieldOptions = [
  { value: "lead_score", label: "Lead Score", icon: Flame },
  { value: "total_opens", label: "Total Opens", icon: Eye },
  { value: "total_clicks", label: "Total Clicks", icon: MousePointerClick },
  { value: "tags", label: "Has Tag", icon: Tag },
  { value: "source", label: "Source", icon: Users },
  { value: "days_since_signup", label: "Days Since Signup", icon: Calendar },
  { value: "last_open_days", label: "Days Since Last Open", icon: Eye },
  { value: "last_click_days", label: "Days Since Last Click", icon: MousePointerClick },
];

const numericOperators = [
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "eq", label: "=" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];

const tagOperators = [
  { value: "contains", label: "has" },
  { value: "not_contains", label: "doesn't have" },
];

const sourceOperators = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
];

function getOperators(field: string) {
  if (field === "tags") return tagOperators;
  if (field === "source") return sourceOperators;
  return numericOperators;
}

export default function SegmentBuilder({ open, onOpenChange, onApply, availableTags }: Props) {
  const [rules, setRules] = useState<SegmentRule[]>([]);

  const addRule = () => {
    setRules(prev => [...prev, { id: crypto.randomUUID(), field: "lead_score", operator: "gte", value: "" }]);
  };

  const updateRule = (id: string, updates: Partial<SegmentRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleApply = () => {
    const valid = rules.filter(r => r.value.trim());
    onApply(valid);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Segment Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Add rules to filter subscribers</p>
          )}

          {rules.map(rule => {
            const operators = getOperators(rule.field);
            const isTag = rule.field === "tags";
            const isSource = rule.field === "source";

            return (
              <div key={rule.id} className="flex gap-2 items-start p-2 rounded-lg border border-border bg-card/50">
                <div className="flex-1 space-y-2">
                  <Select value={rule.field} onValueChange={v => updateRule(rule.id, { field: v, operator: getOperators(v)[0].value, value: "" })}>
                    <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1.5">
                    <Select value={rule.operator} onValueChange={v => updateRule(rule.id, { operator: v })}>
                      <SelectTrigger className="w-20 h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {operators.map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isTag ? (
                      <Select value={rule.value} onValueChange={v => updateRule(rule.id, { value: v })}>
                        <SelectTrigger className="flex-1 h-7 text-xs rounded-lg"><SelectValue placeholder="Select tag" /></SelectTrigger>
                        <SelectContent>
                          {availableTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : isSource ? (
                      <Select value={rule.value} onValueChange={v => updateRule(rule.id, { value: v })}>
                        <SelectTrigger className="flex-1 h-7 text-xs rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stream_join">Live Stream</SelectItem>
                          <SelectItem value="rsvp">RSVP</SelectItem>
                          <SelectItem value="membership">Membership</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        value={rule.value}
                        onChange={e => updateRule(rule.id, { value: e.target.value })}
                        className="flex-1 h-7 text-xs rounded-lg"
                        placeholder="Value"
                      />
                    )}
                  </div>
                </div>
                <button onClick={() => removeRule(rule.id)} className="text-muted-foreground hover:text-destructive mt-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <Button variant="outline" onClick={addRule} className="w-full rounded-xl gap-2 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </Button>

        {rules.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center">
            All rules are combined with AND logic
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setRules([]); onApply([]); onOpenChange(false); }}>Clear All</Button>
          <Button onClick={handleApply} style={{ background: "#3D7CFF", color: "#0A0A0A" }}>
            Apply Segment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
