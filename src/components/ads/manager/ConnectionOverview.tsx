import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Activity, ExternalLink, Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS, type PlatformMeta } from "./platforms";

/**
 * Overview of ad-account + pixel health, unified over the EXISTING infra:
 *   - ad_connections (OAuth token / ad account)  → publish capability
 *   - ad_integrations (pixel_id, is_active)       → conversion tracking health
 *
 * This does not re-implement connecting. It links to the existing flows:
 *   - /settings/connections  (Meta OAuth — native ad-account link)
 *   - /ad-integrations       (pixel setup)
 */

interface ConnRow {
  provider: string;
  status: string;
  selected_ad_account_id: string | null;
}
interface PixelRow {
  platform: string;
  pixel_id: string;
  is_active: boolean;
}

export default function ConnectionOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conns, setConns] = useState<ConnRow[]>([]);
  const [pixels, setPixels] = useState<PixelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, p] = await Promise.all([
      supabase
        .from("ad_connections")
        .select("provider,status,selected_ad_account_id")
        .eq("user_id", user.id),
      supabase.from("ad_integrations").select("platform,pixel_id,is_active").eq("user_id", user.id),
    ]);
    setConns((c.data as ConnRow[]) || []);
    setPixels((p.data as PixelRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const activePixels = pixels.filter((p) => p.is_active).length;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ad accounts &amp; tracking
        </h2>
        <button
          onClick={() => navigate("/ad-integrations")}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Pixel setup <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading
          ? PLATFORMS.map((p) => <Skeleton key={p.id} className="h-[132px] w-full" />)
          : PLATFORMS.map((p) => (
              <PlatformStatusCard
                key={p.id}
                platform={p}
                connected={conns.some(
                  (c) => c.provider === p.connProvider && c.status === "active",
                )}
                pixel={pixels.find((px) => px.platform === p.pixelPlatform)}
                onConnect={() =>
                  navigate(
                    p.connProvider === "meta" ? "/settings/connections" : "/ad-integrations",
                  )
                }
              />
            ))}
      </div>

      {/* Pixel-health summary — reuses ad_integrations state */}
      {!loading && (
        <div className="mt-3 flex items-center gap-2 border border-border bg-muted/30 px-3 py-2">
          <Radar className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            {activePixels > 0 ? (
              <>
                <span className="font-semibold text-foreground">{activePixels} pixel(s)</span> firing
                conversions across your creator pages.
              </>
            ) : (
              <>No conversion pixel is active yet — install one to measure ad ROI.</>
            )}{" "}
            <button
              onClick={() => navigate("/ad-integrations")}
              className="text-primary hover:underline"
            >
              Manage pixels
            </button>
          </p>
        </div>
      )}
    </section>
  );
}

function PlatformStatusCard({
  platform,
  connected,
  pixel,
  onConnect,
}: {
  platform: PlatformMeta;
  connected: boolean;
  pixel?: PixelRow;
  onConnect: () => void;
}) {
  const Icon = platform.icon;
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 flex items-center justify-center"
            style={{ background: `${platform.color}1A`, color: platform.color }}
          >
            <Icon style={{ width: 18, height: 18 }} />
          </div>
          <span className="text-sm font-semibold">{platform.label}</span>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" /> Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Circle className="w-3.5 h-3.5" /> Not linked
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Activity className={`w-3.5 h-3.5 ${pixel?.is_active ? "text-primary" : ""}`} />
        {pixel?.is_active ? "Pixel active" : pixel ? "Pixel added, inactive" : "No pixel"}
      </div>

      {!connected && (
        <Button variant="outline" size="sm" className="w-full mt-auto" onClick={onConnect}>
          Connect
        </Button>
      )}
    </Card>
  );
}
