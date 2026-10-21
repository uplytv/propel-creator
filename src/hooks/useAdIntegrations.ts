import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { initMetaPixel, initGoogleTag, resetMetaPixel, resetGoogleTag } from "@/lib/adTracking";
import { Sentry } from "@/lib/sentry";
import { AD_INTEGRATION_COLUMNS } from "@/lib/safeColumns";

type Platform = "meta" | "google";

interface AdIntegration {
  id: string;
  platform: Platform;
  pixel_id: string;
  is_active: boolean;
  /** Server-computed; the token itself is never readable by the client. */
  has_access_token?: boolean | null;
  test_event_code?: string | null;
}

export function useAdIntegrations() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<AdIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ad_integrations")
      .select(AD_INTEGRATION_COLUMNS)
      .eq("user_id", user.id);
    if (error) {
      Sentry.captureException(error, { tags: { context: "ad_integrations" } });
    } else {
      setIntegrations((data || []) as AdIntegration[]);
      // Auto-init any active pixels
      for (const int of data || []) {
        if (int.is_active) {
          if (int.platform === "meta") initMetaPixel(int.pixel_id);
          if (int.platform === "google") initGoogleTag(int.pixel_id);
        }
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getIntegration = (platform: Platform) =>
    integrations.find((i) => i.platform === platform);

  const saveIntegration = async (platform: Platform, pixelId: string) => {
    if (!user) return;
    const existing = getIntegration(platform);

    if (existing) {
      const { error } = await supabase
        .from("ad_integrations")
        .update({ pixel_id: pixelId, is_active: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("ad_integrations")
        .insert({ user_id: user.id, platform, pixel_id: pixelId, is_active: true });
      if (error) throw error;
    }

    // Init the pixel/tag immediately
    if (platform === "meta") initMetaPixel(pixelId);
    if (platform === "google") initGoogleTag(pixelId);

    await fetchIntegrations();
  };

  const disconnectIntegration = async (platform: Platform) => {
    if (!user) return;
    const existing = getIntegration(platform);
    if (!existing) return;

    const { error } = await supabase
      .from("ad_integrations")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;

    if (platform === "meta") resetMetaPixel();
    if (platform === "google") resetGoogleTag();

    await fetchIntegrations();
  };

  const updateCapiCredentials = async (
    accessToken: string,
    testEventCode: string | null
  ) => {
    if (!user) return;
    const existing = getIntegration("meta");
    if (!existing) throw new Error("Connect Meta Pixel first");
    const { error } = await supabase
      .from("ad_integrations")
      .update({
        access_token: accessToken || null,
        test_event_code: testEventCode || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    await fetchIntegrations();
  };

  return {
    integrations,
    loading,
    getIntegration,
    saveIntegration,
    disconnectIntegration,
    updateCapiCredentials,
  };
}
