import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plug, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Provider = "meta" | "google" | "tiktok";

interface AdConnection {
  id: string;
  provider: Provider;
  status: "active" | "expired" | "revoked";
  expires_at: string | null;
  account_data: any;
  selected_ad_account_id: string | null;
  selected_page_id: string | null;
  selected_ig_account_id: string | null;
  selected_pixel_id: string | null;
  updated_at: string;
}

const PROVIDERS: {
  id: Provider;
  name: string;
  blurb: string;
  comingSoon?: boolean;
}[] = [
  { id: "meta", name: "Meta (Facebook & Instagram)", blurb: "Launch Facebook & Instagram ads natively." },
  { id: "google", name: "Google Ads", blurb: "Search, YouTube, and Display campaigns.", comingSoon: true },
  { id: "tiktok", name: "TikTok Ads", blurb: "TikTok Business advertiser campaigns.", comingSoon: true },
];

function StatusPill({ status }: { status: "not_connected" | "active" | "expired" | "revoked" }) {
  const map = {
    not_connected: { label: "Not connected", cls: "bg-white/5 text-white/50" },
    active: { label: "Connected", cls: "bg-[#3D7CFF]/15 text-[#3D7CFF]" },
    expired: { label: "Expired", cls: "bg-amber-500/15 text-amber-400" },
    revoked: { label: "Revoked", cls: "bg-rose-500/15 text-rose-400" },
  };
  const s = map[status];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function SettingsConnections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connections, setConnections] = useState<AdConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Provider | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ad_connections")
      .select(
        "id,provider,status,expires_at,account_data,selected_ad_account_id,selected_page_id,selected_ig_account_id,selected_pixel_id,updated_at",
      )
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to load connections");
    } else {
      setConnections((data as AdConnection[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for OAuth popup completion
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (d?.type === "uply:oauth") {
        if (d.success) {
          toast.success(`${d.provider} connected`);
        } else {
          toast.error(`${d.provider} connection failed`);
        }
        setConnecting(null);
        load();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [load]);

  const connect = async (provider: Provider) => {
    if (provider !== "meta") {
      toast.info("Coming soon", { description: `${provider} ads will be available shortly.` });
      return;
    }
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke("oauth-meta-start");
      if (error) throw error;
      if (!data?.authorize_url) {
        toast.error("Meta is not configured yet", {
          description: data?.error || "Add Meta app credentials to enable native publishing.",
        });
        setConnecting(null);
        return;
      }
      const w = 600,
        h = 720;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(
        data.authorize_url,
        "uply_oauth",
        `width=${w},height=${h},left=${left},top=${top}`,
      );
      if (!popup) {
        toast.error("Popup blocked — allow popups and try again.");
        setConnecting(null);
        return;
      }
      // Fallback: detect popup close without postMessage
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setConnecting((cur) => (cur === provider ? null : cur));
          load();
        }
      }, 1000);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start OAuth");
      setConnecting(null);
    }
  };

  const updateSelection = async (
    conn: AdConnection,
    field:
      | "selected_ad_account_id"
      | "selected_page_id"
      | "selected_ig_account_id"
      | "selected_pixel_id",
    value: string,
  ) => {
    const { error } = await supabase
      .from("ad_connections")
      .update({ [field]: value || null })
      .eq("id", conn.id);
    if (error) {
      toast.error("Could not save selection");
    } else {
      setConnections((cs) => cs.map((c) => (c.id === conn.id ? { ...c, [field]: value } : c)));
    }
  };

  const getConnection = (p: Provider) => connections.find((c) => c.provider === p);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white mobile-safe-content">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk, system-ui" }}>
            Ad Connections
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Connect your ad accounts once. Launch campaigns from UPLY without ever leaving.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </div>
        ) : (
          <div className="space-y-4">
            {PROVIDERS.map((p) => {
              const conn = getConnection(p.id);
              const status: "not_connected" | "active" | "expired" | "revoked" = !conn
                ? "not_connected"
                : conn.status;
              const adAccts = conn?.account_data?.ad_accounts || [];
              const pages = conn?.account_data?.pages || [];
              const igs = conn?.account_data?.ig_accounts || [];

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <Plug className="w-5 h-5 text-[#3D7CFF]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-base">{p.name}</h2>
                          {p.comingSoon && (
                            <span className="text-[10px] uppercase tracking-wide text-white/40 border border-white/10 px-1.5 py-0.5 rounded">
                              Coming soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{p.blurb}</p>
                      </div>
                    </div>
                    <StatusPill status={status} />
                  </div>

                  {status === "not_connected" && (
                    <div className="mt-4">
                      <Button
                        onClick={() => connect(p.id)}
                        disabled={connecting === p.id || p.comingSoon}
                        className="bg-[#3D7CFF] text-black hover:bg-[#3D7CFF]/90 font-semibold min-h-[44px]"
                      >
                        {connecting === p.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…
                          </>
                        ) : (
                          <>Connect {p.name.split(" ")[0]}</>
                        )}
                      </Button>
                    </div>
                  )}

                  {status === "active" && conn && (
                    <div className="mt-5 space-y-4">
                      {p.id === "meta" && (
                        <>
                          <SelectField
                            label="Ad account"
                            value={conn.selected_ad_account_id || ""}
                            onChange={(v) => updateSelection(conn, "selected_ad_account_id", v)}
                            options={adAccts.map((a: any) => ({
                              value: a.id,
                              label: `${a.name || a.id} (${a.currency || ""})`,
                            }))}
                            empty="No ad accounts found"
                          />
                          <SelectField
                            label="Facebook page"
                            value={conn.selected_page_id || ""}
                            onChange={(v) => updateSelection(conn, "selected_page_id", v)}
                            options={pages.map((p: any) => ({ value: p.id, label: p.name }))}
                            empty="No pages found"
                          />
                          <SelectField
                            label="Instagram account"
                            value={conn.selected_ig_account_id || ""}
                            onChange={(v) => updateSelection(conn, "selected_ig_account_id", v)}
                            options={igs.map((i: any) => ({
                              value: i.id,
                              label: `@${i.username || i.id}`,
                            }))}
                            empty="No Instagram business accounts linked"
                            optional
                          />
                          <div className="text-xs text-white/40 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#3D7CFF]" />
                            Long-lived token expires{" "}
                            {conn.expires_at
                              ? new Date(conn.expires_at).toLocaleDateString()
                              : "in ~60 days"}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {(status === "expired" || status === "revoked") && (
                    <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-200/80 flex-1">
                        Reconnect to keep publishing ads.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => connect(p.id)}
                        className="bg-[#3D7CFF] text-black hover:bg-[#3D7CFF]/90 font-semibold"
                      >
                        Reconnect
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/50 leading-relaxed">
          <p className="flex items-center gap-2 text-white/70 font-semibold mb-1">
            <ExternalLink className="w-3.5 h-3.5" /> What happens when you connect
          </p>
          <p>
            UPLY exchanges a secure OAuth code for a token from the provider. Tokens are encrypted
            with AES-GCM before storage and never exposed to the browser. You can disconnect at any
            time, which revokes UPLY's access at the provider.
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  empty,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  empty: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70 mb-1.5">
        {label}
        {optional && <span className="text-white/30 font-normal ml-1">(optional)</span>}
      </label>
      {options.length === 0 ? (
        <div className="text-xs text-white/40 italic px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
          {empty}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#3D7CFF] min-h-[44px]"
          style={{ fontSize: 16 }}
        >
          <option value="">— Choose —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0A0A0A]">
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
