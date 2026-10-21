import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Code, Key, Plus, Copy, Check, Trash2, Webhook, BookOpen, Zap, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { API_KEY_COLUMNS } from "@/lib/safeColumns";

const EVENTS = ["stream.started", "stream.ended", "purchase.completed", "subscription.created", "subscription.cancelled", "tip.received", "member.joined"];

const ENDPOINTS = [
  { method: "GET", path: "/v1/streams", desc: "List your live and past streams" },
  { method: "GET", path: "/v1/streams/:id", desc: "Get a single stream" },
  { method: "GET", path: "/v1/products", desc: "List your products" },
  { method: "POST", path: "/v1/products", desc: "Create a product" },
  { method: "GET", path: "/v1/members", desc: "List your community members" },
  { method: "GET", path: "/v1/analytics", desc: "Revenue, views, conversion data" },
  { method: "GET", path: "/v1/wallet", desc: "Current balance and transactions" },
  { method: "POST", path: "/v1/webhooks", desc: "Register a webhook endpoint" },
];

const METHOD_COLOR: Record<string, string> = { GET: "hsl(var(--primary))", POST: "hsl(var(--accent-foreground))", PUT: "hsl(var(--warning))", DELETE: "hsl(var(--destructive))" };

export default function DeveloperAPI() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [tab, setTab] = useState<"keys" | "webhooks" | "docs">("keys");
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [addingWebhook, setAddingWebhook] = useState(false);

  useEffect(() => { if (user) { loadKeys(); loadWebhooks(); } }, [user]);

  const loadKeys = async () => {
    const { data } = await supabase.from("api_keys" as any).select(API_KEY_COLUMNS).eq("user_id", user!.id).order("created_at", { ascending: false });
    setKeys(data || []);
  };

  const loadWebhooks = async () => {
    const { data } = await supabase.from("api_webhooks" as any).select("id, url, events, is_active, created_at").eq("user_id", user!.id).order("created_at", { ascending: false });
    setWebhooks(data || []);
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      // Generated + hashed server-side; the plaintext key is returned once.
      const { data, error } = await supabase.functions.invoke("developer-credentials", { body: { action: "create_key", name: newKeyName.trim() } });
      if (error || !data?.key) throw error ?? new Error("Failed");
      const rawKey: string = data.key;
      setNewKey(rawKey);
      setNewKeyName("");
      await loadKeys();
      toast.success("API key created! Copy it now — it won't be shown again.");
    } catch { toast.error("Failed to create key"); }
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    await supabase.from("api_keys" as any).update({ is_active: false }).eq("id", id);
    await loadKeys();
    toast.success("Key revoked");
  };

  const deleteKey = async (id: string) => {
    await supabase.from("api_keys" as any).delete().eq("id", id);
    await loadKeys();
    toast.success("Key deleted");
  };

  const addWebhook = async () => {
    if (!webhookUrl.trim() || !selectedEvents.size) return;
    setAddingWebhook(true);
    try {
      // Secret is generated server-side, stored encrypted (Vault) and shown only once.
      const { data, error } = await supabase.functions.invoke("developer-credentials", { body: { action: "create_webhook", url: webhookUrl.trim(), events: Array.from(selectedEvents) } });
      if (error || !data?.secret) throw error ?? new Error("Failed");
      setNewWebhookSecret(data.secret);
      setWebhookUrl("");
      setSelectedEvents(new Set());
      await loadWebhooks();
      toast.success("Webhook registered! Copy the signing secret now — it won't be shown again.");
    } catch { toast.error("Failed to add webhook"); }
    setAddingWebhook(false);
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id); toast.success("Copied!"); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Code className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Developer API</h1>
            <p className="text-xs text-muted-foreground">Build on UPLY. Connect your tools. Automate your business.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[{ label: "API Keys", value: keys.filter((k: any) => k.is_active).length, icon: Key },
            { label: "Webhooks", value: webhooks.filter((w: any) => w.is_active).length, icon: Webhook },
            { label: "Endpoints", value: ENDPOINTS.length, icon: Zap }].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl">
          {[{ id: "keys", label: "API Keys" }, { id: "webhooks", label: "Webhooks" }, { id: "docs", label: "Reference" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
          ))}
        </div>

        {/* API KEYS TAB */}
        {tab === "keys" && (
          <div className="space-y-4">
            {newKey && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-primary mb-2">⚠️ Copy your key now. It won't be shown again.</p>
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground break-all">
                  {newKey}
                  <button onClick={() => copy(newKey, "newkey")} className="shrink-0 p-1.5 rounded hover:bg-secondary">
                    {copied === "newkey" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <button onClick={() => setNewKey(null)} className="text-xs text-muted-foreground hover:text-foreground mt-2">I've saved it, dismiss</button>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Create new key</p>
              <div className="flex gap-2">
                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. Production, Zapier)"
                  style={{ fontSize: 16 }} onKeyDown={e => e.key === "Enter" && createKey()}
                  className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                <Button onClick={createKey} disabled={creating || !newKeyName.trim()} className="gap-1.5">
                  {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" />Create</>}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {keys.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No keys yet. Create one above.</p>}
              {keys.map((k: any, i: number) => (
                <motion.div key={k.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{k.name}</p>
                      {!k.is_active && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">REVOKED</span>}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground">{k.key_prefix}••••••••••••••••••••</p>
                    <p className="text-[10px] text-muted-foreground">{k.requests_total || 0} requests · Created {new Date(k.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {k.is_active && <button onClick={() => revokeKey(k.id)} className="px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-all">Revoke</button>}
                    <button onClick={() => deleteKey(k.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Authentication</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Pass your key in the Authorization header:</p>
                  <code className="text-[11px] font-mono text-primary block mt-1">Authorization: Bearer sk_live_...</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WEBHOOKS TAB */}
        {tab === "webhooks" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Register webhook endpoint</p>
              <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/uply-webhook"
                style={{ fontSize: 16 }}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">Events to subscribe to:</p>
                <div className="flex flex-wrap gap-1.5">
                  {EVENTS.map(ev => (
                    <button key={ev} onClick={() => setSelectedEvents(prev => { const n = new Set(prev); n.has(ev) ? n.delete(ev) : n.add(ev); return n; })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-all"
                      style={{ borderColor: selectedEvents.has(ev) ? "hsl(var(--primary))" : "hsl(var(--border))", background: selectedEvents.has(ev) ? "hsl(var(--primary) / 0.1)" : "hsl(var(--card))", color: selectedEvents.has(ev) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={addWebhook} disabled={addingWebhook || !webhookUrl.trim() || !selectedEvents.size} className="gap-1.5">
                {addingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Webhook className="w-3.5 h-3.5" />Register Webhook</>}
              </Button>
            </div>

            {newWebhookSecret && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-primary mb-2">⚠️ Copy your webhook signing secret now. It won't be shown again.</p>
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground break-all">
                  {newWebhookSecret}
                  <button onClick={() => copy(newWebhookSecret, "newsecret")} className="shrink-0 p-1.5 rounded hover:bg-secondary" aria-label="Copy webhook secret">
                    {copied === "newsecret" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <button onClick={() => setNewWebhookSecret(null)} className="text-xs text-muted-foreground hover:text-foreground mt-2">I've saved it, dismiss</button>
              </div>
            )}

            <div className="space-y-2">
              {webhooks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No webhooks yet.</p>}
              {webhooks.map((w: any, i: number) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-foreground truncate flex-1">{w.url}</p>
                    <button onClick={async () => { await supabase.from("api_webhooks" as any).delete().eq("id", w.id); loadWebhooks(); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-[10px]">{w.events.map((ev: string) => <span key={ev} className="inline-block px-1.5 py-0.5 bg-secondary rounded text-muted-foreground mr-1 mb-0.5">{ev}</span>)}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Secret: whsec_•••••••• (shown once at creation)</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* DOCS TAB */}
        {tab === "docs" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Base URL</p>
              <code className="text-sm font-mono text-primary">https://uply.tv/api</code>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground mb-2">Endpoints</p>
              {ENDPOINTS.map((ep, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ color: METHOD_COLOR[ep.method] || "hsl(var(--foreground))", background: "hsl(var(--secondary))" }}>{ep.method}</span>
                  <code className="text-xs font-mono text-foreground flex-1">{ep.path}</code>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">{ep.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-2">Webhook payload example</p>
              <pre className="text-[11px] font-mono text-muted-foreground bg-secondary/50 rounded-lg p-3 overflow-x-auto">{`{
  "event": "purchase.completed",
  "created": 1712345678,
  "data": {
    "id": "txn_abc123",
    "buyer_id": "usr_xyz",
    "product_id": "prod_456",
    "amount": 97.00,
    "currency": "USD",
    "creator_earnings": 92.15
  }
}`}</pre>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
