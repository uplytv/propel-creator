import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Megaphone, UserPlus, Trash2, Loader2, Copy, Check, QrCode, Download, Info } from "lucide-react";
import { toast } from "sonner";

interface PromoterRow {
  id: string;
  promoter_user_id: string | null;
  promoter_name: string | null;
  promoter_email: string | null;
  code: string;
  created_at: string;
}

interface SaleRow {
  promoter_id: string;
  amount_cents: number;
  tickets_count: number;
}

function makeCode(base: string): string {
  const stem = (base || "PROMO").replace(/[^a-zA-Z0-9]/g, "").substring(0, 12).toUpperCase() || "PROMO";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${stem}-${rand}`;
}

/**
 * Event Promoter Kit (creator side): event-scoped promoter links, sales
 * attribution leaderboard, CSV export. ATTRIBUTION ONLY — UPLY tracks who
 * sold what; paying promoters stays the creator's manual action.
 */
export default function EventPromotersManager({ eventId, eventUrl }: { eventId: string; eventUrl: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ name: string; link: string } | null>(null);

  const { data: promoters, isLoading } = useQuery({
    queryKey: ["event-promoters", eventId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("event_promoters")
        .select("id, promoter_user_id, promoter_name, promoter_email, code, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      const rows = (data ?? []) as PromoterRow[];
      // Resolve usernames for promoters who are UPLY users
      const ids = rows.map((r) => r.promoter_user_id).filter(Boolean) as string[];
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
      return rows.map((r) => ({
        ...r,
        label: r.promoter_name || (r.promoter_user_id ? names[r.promoter_user_id] : null) || r.promoter_email || "Promoter",
      }));
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["event-promoter-sales", eventId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("event_promoter_sales")
        .select("promoter_id, amount_cents, tickets_count")
        .eq("event_id", eventId);
      return (data ?? []) as SaleRow[];
    },
  });

  const leaderboard = useMemo(() => {
    const byPromoter: Record<string, { tickets: number; cents: number }> = {};
    for (const s of sales ?? []) {
      const agg = (byPromoter[s.promoter_id] ??= { tickets: 0, cents: 0 });
      agg.tickets += s.tickets_count ?? 0;
      agg.cents += s.amount_cents ?? 0;
    }
    const totalCents = Object.values(byPromoter).reduce((n, a) => n + a.cents, 0);
    return (promoters ?? [])
      .map((p) => ({
        ...p,
        tickets: byPromoter[p.id]?.tickets ?? 0,
        cents: byPromoter[p.id]?.cents ?? 0,
        sharePct: totalCents > 0 ? ((byPromoter[p.id]?.cents ?? 0) / totalCents) * 100 : 0,
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [promoters, sales]);

  const linkFor = (code: string) => `${eventUrl}?promo=${encodeURIComponent(code)}`;

  const add = async () => {
    const trimmedName = name.trim();
    const trimmedHandle = handle.trim().replace(/^@/, "");
    const trimmedEmail = email.trim();
    if (!trimmedName && !trimmedHandle) {
      toast.error("Add a promoter name or @username");
      return;
    }
    setAdding(true);
    try {
      // If a username was given, resolve it to a UPLY user
      let promoterUserId: string | null = null;
      if (trimmedHandle) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("username", trimmedHandle)
          .maybeSingle();
        if (!prof?.user_id) {
          toast.error("No user found", { description: `@${trimmedHandle} — add them by name/email instead.` });
          return;
        }
        promoterUserId = prof.user_id;
      }

      // The roster row denormalizes the event's creator_id
      const { data: ev } = await supabase
        .from("events")
        .select("creator_id")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev?.creator_id) {
        toast.error("Couldn't load event");
        return;
      }

      // Generate a unique-per-event code; retry on the rare collision
      let inserted = false;
      let lastError = "";
      for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
        const code = makeCode(trimmedName || trimmedHandle);
        const { error } = await (supabase as any).from("event_promoters").insert({
          event_id: eventId,
          creator_id: ev.creator_id,
          promoter_user_id: promoterUserId,
          promoter_name: trimmedName || null,
          promoter_email: trimmedEmail || null,
          code,
        });
        if (!error) {
          inserted = true;
        } else if (!error.message?.includes("duplicate")) {
          lastError = error.message;
          break;
        }
      }
      if (!inserted) {
        toast.error("Couldn't add promoter", { description: lastError || "Try again." });
        return;
      }
      toast.success(`Promoter added${trimmedHandle ? ` (@${trimmedHandle})` : ""}`, {
        description: "Copy their link below and send it to them.",
      });
      setName("");
      setHandle("");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["event-promoters", eventId] });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    await (supabase as any).from("event_promoters").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["event-promoters", eventId] });
  };

  const copyLink = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(linkFor(code));
      setCopiedId(id);
      toast.success("Promoter link copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const exportCsv = () => {
    const header = "promoter,code,tickets_sold,revenue_attributed_usd,share_pct";
    const rows = leaderboard.map((p) =>
      [
        `"${(p.label || "").replace(/"/g, '""')}"`,
        p.code,
        p.tickets,
        (p.cents / 100).toFixed(2),
        p.sharePct.toFixed(1),
      ].join(","),
    );
    const blob = new Blob([`${header}\n${rows.join("\n")}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promoters-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Promoters</h3>
      </div>

      {/* Honest banner — v1 is attribution only, no automatic payouts */}
      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90">
          UPLY tracks attribution — pay promoters your way. Automatic promoter payouts coming later.
        </p>
      </div>

      {/* Add promoter */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Promoter name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Input placeholder="@username (optional)" value={handle} onChange={(e) => setHandle(e.target.value)} className="flex-1" />
        </div>
        <Input placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={add} disabled={adding || (!name.trim() && !handle.trim())} className="w-full gap-2">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add promoter
        </Button>
      </div>

      {/* Roster with copyable links + QR */}
      <div className="space-y-2">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (promoters ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No promoters yet. Add one to generate their tracked link.</p>
        ) : (
          (promoters ?? []).map((p: any) => (
            <div key={p.id} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.label}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{linkFor(p.code)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 px-2 gap-1" onClick={() => copyLink(p.id, p.code)} aria-label="Copy promoter link">
                    {copiedId === p.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setQrFor({ name: p.label, link: linkFor(p.code) })} aria-label="Show QR code">
                    <QrCode className="w-3.5 h-3.5" />
                  </Button>
                  <button onClick={() => remove(p.id)} aria-label="Remove promoter" className="text-muted-foreground hover:text-destructive p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Leaderboard */}
      {(promoters ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-foreground">Leaderboard</h4>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCsv} disabled={leaderboard.length === 0}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-3 py-2">Promoter</th>
                  <th className="text-right font-medium px-3 py-2">Tickets</th>
                  <th className="text-right font-medium px-3 py-2">Revenue</th>
                  <th className="text-right font-medium px-3 py-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 text-foreground">
                      <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                      {p.label}
                      <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">{p.code}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{p.tickets}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">${(p.cents / 100).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{p.sharePct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Revenue attributed = ticket subtotals from checkouts that used a promoter's link (7-day window). Payouts to promoters are yours to make.
          </p>
        </div>
      )}

      {/* QR dialog */}
      <Dialog open={!!qrFor} onOpenChange={(o) => !o && setQrFor(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Promoter QR</DialogTitle>
            <DialogDescription>{qrFor?.name} — scans open the event with their code applied.</DialogDescription>
          </DialogHeader>
          {qrFor && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={qrFor.link} size={180} level="M" includeMargin={false} />
              </div>
              <p className="text-[11px] font-mono text-muted-foreground break-all text-center">{qrFor.link}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
