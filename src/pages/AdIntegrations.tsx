import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plug, CheckCircle2, Circle, ExternalLink, Users, Eye, ShoppingCart,
  UserPlus, Zap, BarChart3, Target, TrendingUp, ArrowRight, RefreshCw,
  Activity, Globe, Link2, Rocket, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import AudienceTemplates from "@/components/ads/AudienceTemplates";
import CampaignPerformance from "@/components/ads/CampaignPerformance";
import BoostCampaignBuilder, { type LaunchedCampaign } from "@/components/ads/BoostCampaignBuilder";
import { toast } from "sonner";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAdIntegrations } from "@/hooks/useAdIntegrations";

/* ─────── types ─────── */
type Platform = "meta" | "google";

interface PixelEvent {
  name: string;
  label: string;
  firing: boolean;
}

/* ─────── event definitions ─────── */
const metaEvents: PixelEvent[] = [
  { name: "PageView", label: "PageView", firing: true },
  { name: "ViewContent", label: "ViewContent", firing: true },
  { name: "Purchase", label: "Purchase", firing: true },
  { name: "Subscribe", label: "Subscribe", firing: false },
];

const googleEvents: PixelEvent[] = [
  { name: "page_view", label: "Page View", firing: true },
  { name: "sign_up", label: "Community Join", firing: true },
  { name: "purchase", label: "Course Purchase", firing: true },
  { name: "begin_checkout", label: "Stream Signup", firing: false },
];

/* ─────── component ─────── */
export default function AdIntegrations() {
  const { campaigns, launchCampaign, updateStatus, deleteCampaign, duplicateCampaign } = useCampaigns();
  const { getIntegration, saveIntegration, disconnectIntegration, updateCapiCredentials, loading } = useAdIntegrations();

  const [boostOpen, setBoostOpen] = useState(false);
  const [metaPixelInput, setMetaPixelInput] = useState("");
  const [googleTagInput, setGoogleTagInput] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);
  const [googleSaving, setGoogleSaving] = useState(false);

  const metaIntegration = getIntegration("meta");
  const googleIntegration = getIntegration("google");

  const handleConnect = async (platform: Platform) => {
    const pixelId = platform === "meta" ? metaPixelInput.trim() : googleTagInput.trim();
    if (!pixelId) {
      toast.error(`Please enter your ${platform === "meta" ? "Meta Pixel ID" : "Google Tag ID"}`);
      return;
    }

    // Basic validation
    if (platform === "meta" && !/^\d{10,20}$/.test(pixelId)) {
      toast.error("Invalid Pixel ID", { description: "Meta Pixel IDs are numeric (10-20 digits)" });
      return;
    }
    if (platform === "google" && !/^(AW-|G-|GT-)[A-Z0-9]+$/i.test(pixelId)) {
      toast.error("Invalid Tag ID", { description: "Google Tag IDs start with AW-, G-, or GT-" });
      return;
    }

    const setter = platform === "meta" ? setMetaSaving : setGoogleSaving;
    setter(true);
    try {
      await saveIntegration(platform, pixelId);
      toast.success(`${platform === "meta" ? "Meta Pixel" : "Google Tag"} connected!`, { description: "Tracking script has been installed and is now firing events." });
      if (platform === "meta") setMetaPixelInput("");
      else setGoogleTagInput("");
    } catch (err) {
      toast.error("Failed to save integration");
    }
    setter(false);
  };

  const handleDisconnect = async (platform: Platform) => {
    try {
      await disconnectIntegration(platform);
      toast.success(`${platform === "meta" ? "Meta Pixel" : "Google Tag"} disconnected`);
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const handleCampaignLaunch = async (campaign: LaunchedCampaign) => {
    try {
      await launchCampaign(campaign);
      toast.success("Campaign launched!", { description: `"Boost: ${campaign.streamTitle}" is now running` });
    } catch {
      toast.error("Failed to launch campaign");
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">Ad Integrations</h1>
              <p className="text-muted-foreground text-sm">Connect your ad accounts to track conversions and launch campaigns.</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => setBoostOpen(true)} className="hidden sm:flex items-center gap-2">
              <Rocket className="w-4 h-4" /> Boost a Stream
            </Button>
          </div>
          <Button variant="hero" size="sm" onClick={() => setBoostOpen(true)} className="sm:hidden w-full mt-3 flex items-center justify-center gap-2">
            <Rocket className="w-4 h-4" /> Boost a Stream
          </Button>
        </motion.div>

        {/* Connection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Meta Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(214,89%,52%)]/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" fill="hsl(214, 89%, 52%)" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Meta Business</h2>
                    <p className="text-xs text-muted-foreground">Facebook & Instagram Ads</p>
                  </div>
                </div>
                <StatusBadge connected={!!metaIntegration} />
              </div>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {!metaIntegration ? (
                  <motion.div key="meta-disc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your Meta Pixel ID to install the tracking script on all your creator pages. You can find it in your{" "}
                      <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Meta Events Manager
                      </a>.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 498271630582947"
                        value={metaPixelInput}
                        onChange={(e) => setMetaPixelInput(e.target.value)}
                        className="flex-1 font-mono text-sm"
                        maxLength={20}
                      />
                      <Button variant="hero" onClick={() => handleConnect("meta")} disabled={metaSaving}>
                        {metaSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Connect"}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="meta-live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ConnectedDetails
                      idLabel="Pixel ID"
                      idValue={metaIntegration.pixel_id}
                      statusActive={metaIntegration.is_active}
                      events={metaEvents}
                      extraInfo={[
                        { icon: Users, label: "Custom Audiences", value: "Available" },
                        { icon: Globe, label: "Installed On", value: "All creator pages" },
                        { icon: Activity, label: "Server-side CAPI", value: metaIntegration.has_access_token ? "Configured" : "Not set" },
                      ]}
                      onDisconnect={() => handleDisconnect("meta")}
                    />
                    <CapiCredentialsForm
                      hasToken={!!metaIntegration.has_access_token}
                      currentTestCode={metaIntegration.test_event_code || ""}
                      onSave={async (token, testCode) => {
                        try {
                          await updateCapiCredentials(token, testCode);
                          toast.success("CAPI credentials saved", { description: "Server-side events will now fire to Meta." });
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to save CAPI credentials");
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Google Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(4,90%,58%)]/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="hsl(220 90% 56%)" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="hsl(var(--success))" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="hsl(var(--warning))" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="hsl(var(--destructive))" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Google Ads</h2>
                    <p className="text-xs text-muted-foreground">Google Ads & Analytics</p>
                  </div>
                </div>
                <StatusBadge connected={!!googleIntegration} />
              </div>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {!googleIntegration ? (
                  <motion.div key="goog-disc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your Google Tag ID to install the conversion tracking script. Find it in your{" "}
                      <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Google Ads dashboard
                      </a>{" "}
                      or{" "}
                      <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        Google Analytics
                      </a>.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. AW-382946102 or G-XJ4K29M1PQ"
                        value={googleTagInput}
                        onChange={(e) => setGoogleTagInput(e.target.value)}
                        className="flex-1 font-mono text-sm"
                        maxLength={30}
                      />
                      <Button variant="hero" onClick={() => handleConnect("google")} disabled={googleSaving}>
                        {googleSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Connect"}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="goog-live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ConnectedDetails
                      idLabel="Tag ID"
                      idValue={googleIntegration.pixel_id}
                      statusActive={googleIntegration.is_active}
                      events={googleEvents}
                      extraInfo={[
                        { icon: Link2, label: "Tag Type", value: googleIntegration.pixel_id.startsWith("G-") ? "GA4 Property" : "Google Ads" },
                        { icon: Globe, label: "Installed On", value: "All creator pages" },
                      ]}
                      onDisconnect={() => handleDisconnect("google")}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Audience Templates */}
        <AudienceTemplates metaConnected={!!metaIntegration} googleConnected={!!googleIntegration} />

        {/* Campaign Performance Dashboard */}
        <div className="mt-8">
          <CampaignPerformance
            campaigns={campaigns}
            onUpdateStatus={updateStatus}
            onDelete={deleteCampaign}
            onDuplicate={async (source) => {
              await duplicateCampaign(source);
              toast.success("Campaign duplicated", { description: `A copy of "${source.stream_title}" has been created` });
            }}
          />
        </div>
      </div>

      {/* Boost Campaign Builder */}
      <BoostCampaignBuilder
        isOpen={boostOpen}
        onClose={() => setBoostOpen(false)}
        streamTitle="My Stream"
        creatorName="Creator"
        onLaunch={handleCampaignLaunch}
      />
    </AppLayout>
  );
}

/* ─────── sub-components ─────── */

function StatusBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Active
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
      <Circle className="w-2 h-2" />
      Disconnected
    </span>
  );
}

function ConnectedDetails({
  idLabel,
  idValue,
  statusActive,
  events,
  extraInfo,
  onDisconnect,
}: {
  idLabel: string;
  idValue: string;
  statusActive: boolean;
  events: PixelEvent[];
  extraInfo: { icon: React.ElementType; label: string; value: string }[];
  onDisconnect: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{idLabel}</p>
          <p className="text-sm font-mono font-semibold">{idValue}</p>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
          statusActive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        }`}>
          <Activity className="w-3 h-3" />
          {statusActive ? "Pixel Active" : "Pixel Inactive"}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Events Firing</p>
        <div className="grid grid-cols-2 gap-2">
          {events.map((evt) => (
            <div key={evt.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              evt.firing
                ? "border-primary/20 bg-primary/5 text-foreground"
                : "border-border bg-secondary/30 text-muted-foreground"
            }`}>
              {evt.firing ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span className="text-xs font-medium">{evt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {extraInfo.map((info) => (
          <div key={info.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <info.icon className="w-3.5 h-3.5" />
              {info.label}
            </span>
            <span className="text-xs font-semibold">{info.value}</span>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={onDisconnect}>
        <Trash2 className="w-3.5 h-3.5 mr-2" />
        Disconnect
      </Button>
    </div>
  );
}

function CapiCredentialsForm({
  hasToken,
  currentTestCode,
  onSave,
}: {
  hasToken: boolean;
  currentTestCode: string;
  onSave: (token: string, testCode: string) => Promise<void>;
}) {
  // The saved token is write-only (never sent to the browser); enter a new one to replace it.
  const [token, setToken] = useState("");
  const [testCode, setTestCode] = useState(currentTestCode);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(!hasToken);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full text-xs text-primary hover:underline text-left"
      >
        {hasToken ? "Replace Conversions API credentials →" : "+ Add Conversions API credentials"}
      </button>
    );
  }

  return (
    <div className="mt-5 pt-5 border-t border-border space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Conversions API (Server-side)
        </p>
        <p className="text-xs text-muted-foreground">
          Paste your Meta CAPI access token to fire events server-side from SmartLinks. Get one from{" "}
          <a
            href="https://business.facebook.com/events_manager"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Events Manager → Settings → Conversions API
          </a>
          .
        </p>
      </div>
      <Input
        type="password"
        placeholder="CAPI Access Token (EAAG...)"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="font-mono text-xs"
      />
      <Input
        placeholder="Test Event Code (optional, e.g. TEST12345)"
        value={testCode}
        onChange={(e) => setTestCode(e.target.value)}
        className="font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button
          variant="hero"
          size="sm"
          className="flex-1"
          disabled={saving || !token.trim()}
          onClick={async () => {
            setSaving(true);
            await onSave(token.trim(), testCode.trim());
            setSaving(false);
            setOpen(false);
          }}
        >
          {saving ? "Saving..." : "Save CAPI Credentials"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
