import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, LogIn, LogOut, ShieldAlert, DollarSign, Download, Activity, Loader2, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

interface ScanRow {
  id: string;
  ticket_id: string | null;
  scanned_by: string;
  gate: string | null;
  direction: string;
  result: string;
  scanned_at: string;
}

const resultColor = (r: string) =>
  r === "accepted" ? "text-emerald-500"
  : r === "rejected_duplicate" ? "text-amber-500"
  : "text-destructive";

export default function EventCommandCenter() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [capacity, setCapacity] = useState<number | null>(null);
  const [occ, setOcc] = useState({ inside: 0, in: 0, out: 0, rejected: 0 });
  const [gross, setGross] = useState(0);
  const [recent, setRecent] = useState<ScanRow[]>([]);
  const [scansPerMin, setScansPerMin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [aria, setAria] = useState<{ fn: string; text: string } | null>(null);
  const [ariaLoading, setAriaLoading] = useState<string | null>(null);

  const runAria = async (fn: string, label: string) => {
    setAriaLoading(fn);
    setAria(null);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { event_id: eventId } });
      if (error) throw error;
      const r = (data as any)?.report ?? (data as any)?.analysis ?? data;
      setAria({ fn: label, text: typeof r === "string" ? r : JSON.stringify(r, null, 2) });
    } catch (e) {
      toast.error(`${label} failed`, { description: (e as Error).message });
    } finally {
      setAriaLoading(null);
    }
  };

  const loadOccupancy = useCallback(async () => {
    if (!eventId) return;
    const { data } = await (supabase as any)
      .from("event_occupancy").select("*").eq("event_id", eventId).maybeSingle();
    if (data) setOcc({ inside: data.current_occupancy ?? 0, in: data.total_in ?? 0, out: data.total_out ?? 0, rejected: data.total_rejected ?? 0 });
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: ev } = await supabase
        .from("events").select("title, ticket_quantity").eq("id", eventId).maybeSingle();
      if (ev) { setTitle(ev.title); setCapacity((ev as any).ticket_quantity ?? null); }

      const { data: orders } = await supabase
        .from("orders").select("total_cents").eq("event_id", eventId).eq("status", "completed");
      setGross(((orders ?? []) as any[]).reduce((s, o) => s + (o.total_cents ?? 0), 0) / 100);

      const { data: scans } = await (supabase as any)
        .from("scans").select("*").eq("event_id", eventId).order("scanned_at", { ascending: false }).limit(60);
      setRecent((scans ?? []) as ScanRow[]);
      await loadOccupancy();
      setLoading(false);
    })();

    // Realtime: new scans
    const channel = supabase
      .channel(`cc-scans-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scans", filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          setRecent((r) => [payload.new as ScanRow, ...r].slice(0, 60));
          loadOccupancy();
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, loadOccupancy]);

  // scans/min from the last 5 minutes of accepted scans
  useEffect(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    const n = recent.filter((s) => s.result === "accepted" && new Date(s.scanned_at).getTime() >= cutoff).length;
    setScansPerMin(Math.round((n / 5) * 10) / 10);
  }, [recent]);

  const exportCsv = async () => {
    if (!eventId) return;
    setExporting(true);
    try {
      const { data } = await (supabase as any)
        .from("scans").select("scanned_at, direction, result, gate, ticket_id, scanned_by")
        .eq("event_id", eventId).order("scanned_at", { ascending: true });
      const rows = (data ?? []) as any[];
      const header = "scanned_at,direction,result,gate,ticket_id,scanned_by";
      const body = rows.map((r) =>
        [r.scanned_at, r.direction, r.result, r.gate ?? "", r.ticket_id ?? "", r.scanned_by].join(",")).join("\n");
      const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `scans-${eventId}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const Stat = ({ icon: Icon, label, value, accent }: any) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <p className={`text-2xl font-bold mt-1 ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`Live · ${title}`} description="Event command center" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={() => navigate("/events")} className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Events</button>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-500" /> Live · {scansPerMin}/min</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export log
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Stat icon={Users} label={`Inside${capacity ? ` / ${capacity}` : ""}`} value={occ.inside} accent="text-primary" />
          <Stat icon={LogIn} label="Total entries" value={occ.in} />
          <Stat icon={LogOut} label="Total exits" value={occ.out} />
          <Stat icon={ShieldAlert} label="Rejected" value={occ.rejected} accent={occ.rejected > 0 ? "text-destructive" : undefined} />
          <Stat icon={DollarSign} label="Gross sales" value={`$${gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} accent="text-emerald-500" />
          <Stat icon={Activity} label="Scans / min" value={scansPerMin} />
        </div>

        {/* ARIA insights */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">ARIA insights</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { fn: "aria-pricing-intelligence", label: "Pricing" },
              { fn: "aria-fraud-sentinel", label: "Fraud check" },
              { fn: "aria-post-event-report", label: "Post-event report" },
            ].map((a) => (
              <Button key={a.fn} variant="outline" size="sm" className="gap-1.5" disabled={!!ariaLoading} onClick={() => runAria(a.fn, a.label)}>
                {ariaLoading === a.fn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />} {a.label}
              </Button>
            ))}
          </div>
          {aria && (
            <pre className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-72 overflow-auto">
              <span className="font-semibold text-foreground">{aria.fn}</span>{"\n"}{aria.text}
            </pre>
          )}
        </div>

        <h2 className="text-sm font-semibold text-foreground mb-2">Live scan feed</h2>
        <div className="rounded-xl border border-border divide-y divide-border/60">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No scans yet.</p>
          ) : (
            recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  {s.direction === "in" ? <LogIn className="w-3.5 h-3.5 text-muted-foreground" /> : <LogOut className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="text-foreground">{s.gate || "Gate"}</span>
                  <span className="text-xs text-muted-foreground">{new Date(s.scanned_at).toLocaleTimeString()}</span>
                </div>
                <span className={`text-xs font-semibold ${resultColor(s.result)}`}>{s.result.replace("rejected_", "✕ ").replace("accepted", "✓ admitted")}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
