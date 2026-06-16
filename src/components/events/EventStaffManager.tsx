import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["scanner", "box_office", "manager"] as const;

interface StaffRow {
  id: string;
  user_id: string;
  role: string;
  gate: string | null;
}

/** Lets an event owner/manager add staff (scanner/box_office/manager) who can
 *  then scan from /scan. Backed by the event_staff table + its RLS. */
export default function EventStaffManager({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("scanner");
  const [gate, setGate] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["event-staff", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_staff")
        .select("id, user_id, role, gate")
        .eq("event_id", eventId);
      const rows = (data ?? []) as StaffRow[];
      const ids = rows.map((r) => r.user_id);
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", ids);
        names = Object.fromEntries(
          (profs ?? []).map((p: any) => [p.user_id, p.display_name || p.username || "User"]),
        );
      }
      return rows.map((r) => ({ ...r, name: names[r.user_id] ?? "User" }));
    },
  });

  const add = async () => {
    const handle = username.trim().replace(/^@/, "");
    if (!handle) return;
    setAdding(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("username", handle)
        .maybeSingle();
      if (!prof?.user_id) {
        toast.error("No user found", { description: `@${handle}` });
        return;
      }
      const { error } = await supabase.from("event_staff").insert({
        event_id: eventId,
        user_id: prof.user_id,
        role,
        gate: gate.trim() || null,
      });
      if (error) {
        toast.error(error.message.includes("duplicate") ? "Already on staff" : "Couldn't add", {
          description: error.message,
        });
        return;
      }
      toast.success(`Added @${handle} as ${role}`);
      setUsername("");
      setGate("");
      qc.invalidateQueries({ queryKey: ["event-staff", eventId] });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    await supabase.from("event_staff").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["event-staff", eventId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Event staff</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Add promoters or door staff by username. They'll be able to scan tickets from their own account at <span className="font-mono">/scan</span>.
      </p>

      <div className="space-y-2">
        <Input placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
            className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.replace("_", " ")}</option>
            ))}
          </select>
          <Input placeholder="Gate (optional)" value={gate} onChange={(e) => setGate(e.target.value)} className="flex-1" />
        </div>
        <Button onClick={add} disabled={adding || !username.trim()} className="w-full gap-2">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add staff
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (staff ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff added yet.</p>
        ) : (
          (staff as any[]).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.role.replace("_", " ")}{s.gate ? ` · Gate ${s.gate}` : ""}</p>
              </div>
              <button onClick={() => remove(s.id)} aria-label="Remove staff" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
