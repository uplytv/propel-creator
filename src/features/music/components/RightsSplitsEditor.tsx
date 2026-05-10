import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Users } from "lucide-react";
import {
  useTrackRightsHolders,
  useUpsertRightsHolder,
  useDeleteRightsHolder,
} from "../hooks/useRoyalties";
import { toast } from "sonner";

export function RightsSplitsEditor({ trackId }: { trackId: string }) {
  const { data: holders = [] } = useTrackRightsHolders(trackId);
  const upsert = useUpsertRightsHolder();
  const remove = useDeleteRightsHolder();

  const [form, setForm] = useState({
    payee_name: "",
    payee_email: "",
    role: "collaborator",
    share_percent: 0,
  });

  const total = holders.reduce((s, h) => s + Number(h.share_percent), 0);
  const remaining = Math.max(0, 100 - total);

  const add = async () => {
    if (!form.payee_name && !form.payee_email) {
      toast.error("Add a payee name or email");
      return;
    }
    if (form.share_percent <= 0 || form.share_percent > remaining) {
      toast.error(`Share must be between 0 and ${remaining}%`);
      return;
    }
    try {
      await upsert.mutateAsync({ track_id: trackId, ...form });
      setForm({ payee_name: "", payee_email: "", role: "collaborator", share_percent: 0 });
      toast.success("Holder added");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" /> Rights & royalty splits
        </h3>
        <Badge variant={total === 100 ? "default" : "outline"}>{total.toFixed(1)}% allocated</Badge>
      </div>

      <div className="space-y-2">
        {holders.map((h) => (
          <div key={h.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{h.payee_name || h.payee_email || "Unnamed"}</p>
              <p className="text-xs text-muted-foreground capitalize">{h.role}</p>
            </div>
            <span className="text-sm font-bold text-primary">{Number(h.share_percent).toFixed(1)}%</span>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(h.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">{remaining.toFixed(1)}% remaining</p>
          <Input placeholder="Payee name" value={form.payee_name} onChange={(e) => setForm({ ...form, payee_name: e.target.value })} />
          <Input type="email" placeholder="Payee email" value={form.payee_email} onChange={(e) => setForm({ ...form, payee_email: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Role (writer, producer…)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <Input
              type="number"
              step="0.1"
              max={remaining}
              placeholder="Share %"
              value={form.share_percent || ""}
              onChange={(e) => setForm({ ...form, share_percent: Number(e.target.value) })}
            />
          </div>
          <Button onClick={add} className="w-full" disabled={upsert.isPending}>
            <Plus className="w-4 h-4 mr-1" /> Add collaborator
          </Button>
        </div>
      )}
    </Card>
  );
}
