import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Megaphone, UserPlus, Trash2, Loader2, Copy, Check, QrCode, Download, Info, Banknote } from "lucide-react";
import { toast } from "sonner";

interface PromoterRow {
  id: string;
  promoter_user_id: string | null;
  promoter_name: string | null;
  promoter_email: string | null;
  code: string;
  commission_pct: number | null;
  created_at: string;
}

interface SaleRow {
  promoter_id: string;
  amount_cents: number;
  tickets_count: number;
}

interface SettlementRow {
  promoter_id: string;
  amount_cents: number;
  created_at: string;
}

interface SettleResult {
  promoter_id: string;
  owed_cents: number;
  settled_cents: number;
  already_settled_cents: number;
  status: "settled" | "insufficient_balance" | "nothing_owed" | "no_wallet";
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function makeCode(base: string): string {
  const stem = (base || "PROMO").replace(/[^a-zA-Z0-9]/g, "").substring(0, 12).toUpperCase() || "PROMO";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${stem}-${rand}`;
}

/**
 * Event Promoter Kit (creator side): event-scoped promoter links, sales
 * attribution leaderboard, CSV export — plus wallet-ledger SETTLEMENTS for
 * promoters who are UPLY users: set a commission %, and "Settle payouts"
 * moves the owed credit from the creator's UPLY wallet to theirs (internal
 * ledger only — real withdrawals still go through Payouts).
 */
export default function EventPromotersManager({ eventId, eventUrl }: { eventId: string; eventUrl: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ name: string; link: string } | null>(null);
  const [pctDrafts, setPctDrafts] = useState<Record<string, string>>({});
  const [settleOpen, setSettleOpen] = useState(false);
  const [settling, setSettling] = useState(false);

  const { data: promoters, isLoading } = useQuery({
    queryKey: ["event-promoters", eventId],
    queryFn: async () => {
      const { data } = await (supabase as any) // cast: awaiting types regen (event_promoters)
        .from("event_promoters")
        .select("id, promoter_user_id, promoter_name, promoter_email, code, commission_pct, created_at")
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
      const { data } = await (supabase as any) // cast: awaiting types regen (event_promoter_sales)
        .from("event_promoter_sales")
        .select("promoter_id, amount_cents, tickets_count")
        .eq("event_id", eventId);
      return (data ?? []) as SaleRow[];
    },
  });

  const { data: settlements } = useQuery({
    queryKey: ["event-promoter-settlements", eventId],
    queryFn: async () => {
      const { data } = await (supabase as any) // cast: awaiting types regen (promoter_settlements)
        .from("promoter_settlements")
        .select("promoter_id, amount_cents, created_at")
        .eq("event_id", eventId);
      return (data ?? []) as SettlementRow[];
    },
  });

  // Creator's own wallet balance (RLS limits the query to their wallet) — shown
  // in the settle confirmation so they know whether the transfer can cover it.
  const { data: walletBalanceCents } = useQuery({
    queryKey: ["own-wallet-balance"],
    queryFn: async () => {
      const { data } = await supabase.from("wallets").select("available_balance").maybeSingle();
      return Math.round(Number((data as any)?.available_balance ?? 0) * 100);
    },
  });

  const leaderboard = useMemo(() => {
    const byPromoter: Record<string, { tickets: number; cents: number }> = {};
    for (const s of sales ?? []) {
      const agg = (byPromoter[s.promoter_id] ??= { tickets: 0, cents: 0 });
      agg.tickets += s.tickets_count ?? 0;
      agg.cents += s.amount_cents ?? 0;
    }
    const settledByPromoter: Record<string, number> = {};
    for (const s of settlements ?? []) {
      settledByPromoter[s.promoter_id] = (settledByPromoter[s.promoter_id] ?? 0) + (s.amount_cents ?? 0);
    }
    const totalCents = Object.values(byPromoter).reduce((n, a) => n + a.cents, 0);
    return (promoters ?? [])
      .map((p) => {
        const cents = byPromoter[p.id]?.cents ?? 0;
        const settledCents = settledByPromoter[p.id] ?? 0;
        // Mirrors the RPC's math: floor(lifetime attributed * pct/100) - settled
        const owedCents =
          p.commission_pct != null && p.promoter_user_id
            ? Math.max(0, Math.floor((cents * p.commission_pct) / 100) - settledCents)
            : 0;
        return {
          ...p,
          tickets: byPromoter[p.id]?.tickets ?? 0,
          cents,
          settledCents,
          owedCents,
          sharePct: totalCents > 0 ? (cents / totalCents) * 100 : 0,
        };
      })
      .sort((a, b) => b.cents - a.cents);
  }, [promoters, sales, settlements]);

  const totalOwedCents = useMemo(() => leaderboard.reduce((n, p) => n + p.owedCents, 0), [leaderboard]);
  const totalSettledCents = useMemo(() => leaderboard.reduce((n, p) => n + p.settledCents, 0), [leaderboard]);

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
        const { error } = await (supabase as any).from("event_promoters").insert({ // cast: awaiting types regen (event_promoters)
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
    await (supabase as any).from("event_promoters").delete().eq("id", id); // cast: awaiting types regen (event_promoters)
    qc.invalidateQueries({ queryKey: ["event-promoters", eventId] });
  };

  const saveCommissionPct = async (p: PromoterRow, raw: string) => {
    const trimmed = raw.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0 || next > 50)) {
      toast.error("Commission must be between 0 and 50%");
      setPctDrafts((d) => ({ ...d, [p.id]: p.commission_pct != null ? String(p.commission_pct) : "" }));
      return;
    }
    if (next === (p.commission_pct ?? null)) return;
    const { error } = await (supabase as any) // cast: awaiting types regen (event_promoters)
      .from("event_promoters")
      .update({ commission_pct: next })
      .eq("id", p.id);
    if (error) {
      toast.error("Couldn't save commission", { description: error.message });
      return;
    }
    toast.success(next === null ? "Auto-payout turned off" : `Commission set to ${next}%`);
    qc.invalidateQueries({ queryKey: ["event-promoters", eventId] });
  };

  const settle = async () => {
    setSettling(true);
    try {
      const { data, error } = await (supabase as any).rpc("settle_event_promoters", { p_event_id: eventId }); // cast: awaiting types regen (settle_event_promoters)
      if (error) {
        toast.error("Settlement failed", { description: error.message });
        return;
      }
      const results = (data ?? []) as SettleResult[];
      const labelFor = (id: string) => (promoters ?? []).find((p: any) => p.id === id)?.label ?? "Promoter";
      let anySettled = false;
      for (const r of results) {
        if (r.status === "settled") {
          anySettled = true;
          toast.success(`Paid ${labelFor(r.promoter_id)} ${usd(r.settled_cents)}`, {
            description: "Credited to their UPLY wallet.",
          });
        } else if (r.status === "insufficient_balance") {
          toast.error(`Not enough balance for ${labelFor(r.promoter_id)}`, {
            description: `${usd(r.owed_cents)} owed — top up by making sales or settle later.`,
          });
        } else if (r.status === "no_wallet") {
          toast.error("Your UPLY wallet isn't set up yet");
        }
        // 'nothing_owed' is silent — nothing changed for that promoter.
      }
      if (!anySettled && results.every((r) => r.status === "nothing_owed")) {
        toast.info("Nothing owed right now", { description: "All commissions are already settled." });
      }
      qc.invalidateQueries({ queryKey: ["event-promoter-settlements", eventId] });
      qc.invalidateQueries({ queryKey: ["own-wallet-balance"] });
      setSettleOpen(false);
    } finally {
      setSettling(false);
    }
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

      {/* Honest banner — auto-payouts exist for linked promoters; external stay manual */}
      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/90">
          Promoters with a UPLY account can be paid automatically: set their commission %, then settle from your
          UPLY wallet. External promoters (name/email only) are still paid your way.
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
              {/* Commission % — auto-payout only works for linked UPLY users */}
              <div className="mt-1.5 flex items-center gap-2">
                {p.promoter_user_id ? (
                  <>
                    <label className="text-[11px] text-muted-foreground shrink-0" htmlFor={`pct-${p.id}`}>
                      Commission
                    </label>
                    <Input
                      id={`pct-${p.id}`}
                      type="number"
                      min={0}
                      max={50}
                      step="0.5"
                      placeholder="—"
                      className="h-7 w-20 text-xs"
                      value={pctDrafts[p.id] ?? (p.commission_pct != null ? String(p.commission_pct) : "")}
                      onChange={(e) => setPctDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      onBlur={(e) => saveCommissionPct(p, e.target.value)}
                    />
                    <span className="text-[11px] text-muted-foreground">% of attributed sales · blank = manual</span>
                  </>
                ) : (
                  <span className="text-[11px] text-muted-foreground">External promoter — pay manually</span>
                )}
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
                  <th className="text-right font-medium px-3 py-2">Owed</th>
                  <th className="text-right font-medium px-3 py-2">Settled</th>
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
                    <td className="px-3 py-2 text-right font-mono text-foreground">
                      {p.promoter_user_id && p.commission_pct != null ? usd(p.owedCents) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {p.settledCents > 0 ? usd(p.settledCents) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Revenue attributed = ticket subtotals from checkouts that used a promoter's link (7-day window). Owed =
            commission % of attributed revenue minus what you've already settled.
          </p>

          {/* Settle payouts — internal wallet-ledger transfer */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {totalOwedCents > 0 ? `${usd(totalOwedCents)} owed to promoters` : "All commissions settled"}
              </p>
              {totalSettledCents > 0 && (
                <p className="text-[11px] text-muted-foreground">Settled to date: {usd(totalSettledCents)}</p>
              )}
            </div>
            <Button
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={totalOwedCents <= 0}
              onClick={() => setSettleOpen(true)}
            >
              <Banknote className="w-3.5 h-3.5" /> Settle payouts
            </Button>
          </div>
        </div>
      )}

      {/* Settle confirmation dialog */}
      <Dialog open={settleOpen} onOpenChange={(o) => !settling && setSettleOpen(o)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Settle promoter payouts</DialogTitle>
            <DialogDescription>
              This moves credit from your UPLY wallet to theirs — real withdrawals still happen via Payouts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {leaderboard
              .filter((p) => p.owedCents > 0)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate mr-2">
                    {p.label} <span className="text-[10px] text-muted-foreground">({p.commission_pct}%)</span>
                  </span>
                  <span className="font-mono text-foreground shrink-0">{usd(p.owedCents)}</span>
                </div>
              ))}
            <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-medium">
              <span>Total</span>
              <span className="font-mono">{usd(totalOwedCents)}</span>
            </div>
            {walletBalanceCents != null && (
              <p className={`text-[11px] ${walletBalanceCents < totalOwedCents ? "text-destructive" : "text-muted-foreground"}`}>
                Your wallet balance: {usd(walletBalanceCents)}
                {walletBalanceCents < totalOwedCents && " — not enough to cover everything; short payouts will be skipped."}
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" disabled={settling} onClick={() => setSettleOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 gap-1.5" disabled={settling || totalOwedCents <= 0} onClick={settle}>
              {settling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />} Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
