import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";

export default function AdminTicketmasterSync() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  if (!isAdmin) return null;

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-global-events");
      if (error) throw error;
      setLastResult(data);
      toast.success(`Synced ${data?.upserted || 0} events`);
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="mx-4 mt-3 rounded-xl p-3 flex items-center justify-between"
      style={{ background: "rgba(61, 124, 255,0.04)", border: "1px solid rgba(61, 124, 255,0.15)" }}
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground">⚙️ Admin: Event Sources</p>
        {lastResult ? (
          <p className="text-[10px] text-muted-foreground truncate">
            TM:{lastResult.ticketmaster} EB:{lastResult.eventbrite} SG:{lastResult.seatgeek} → {lastResult.upserted} upserted
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">Sync Ticketmaster/Eventbrite/SeatGeek now</p>
        )}
      </div>
      <button
        onClick={sync}
        disabled={syncing}
        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
        style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
      >
        {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
}
