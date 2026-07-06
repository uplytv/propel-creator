import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAdCampaigns, type AdCampaignRow } from "@/hooks/useAdCampaigns";
import ConnectionOverview from "@/components/ads/manager/ConnectionOverview";
import CampaignCard from "@/components/ads/manager/CampaignCard";
import CampaignBuilderSheet from "@/components/ads/manager/CampaignBuilderSheet";

export default function AdsManager() {
  const { user } = useAuth();
  const {
    campaigns,
    isLoading,
    isError,
    refetch,
    duplicateCampaign,
    updateCampaign,
    deleteCampaign,
  } = useAdCampaigns();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<AdCampaignRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdCampaignRow | null>(null);
  const [advertiser, setAdvertiser] = useState("");
  const [connectedProviders, setConnectedProviders] = useState<Set<"meta" | "google">>(new Set());

  // Advertiser name (preview) + which ad-account providers are linked (publish gating).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: conns }] = await Promise.all([
        supabase.from("profiles").select("display_name, first_name").eq("id", user.id).maybeSingle(),
        supabase.from("ad_connections").select("provider,status").eq("user_id", user.id),
      ]);
      setAdvertiser(
        profile?.display_name || profile?.first_name || user.email?.split("@")[0] || "",
      );
      const set = new Set<"meta" | "google">();
      for (const c of conns || []) {
        if (c.status === "active" && (c.provider === "meta" || c.provider === "google")) {
          set.add(c.provider);
        }
      }
      setConnectedProviders(set);
    })();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setBuilderOpen(true);
  };
  const openEdit = (c: AdCampaignRow) => {
    setEditing(c);
    setBuilderOpen(true);
  };

  const handleDuplicate = async (c: AdCampaignRow) => {
    try {
      await duplicateCampaign(c);
      toast.success("Campaign duplicated");
    } catch (e: any) {
      toast.error("Couldn't duplicate", { description: e?.message });
    }
  };

  const handleArchive = async (c: AdCampaignRow) => {
    try {
      await updateCampaign({ id: c.id, status: "archived" });
      toast.success("Campaign archived");
    } catch (e: any) {
      toast.error("Couldn't archive", { description: e?.message });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign(deleteTarget.id);
      toast.success("Campaign deleted");
    } catch (e: any) {
      toast.error("Couldn't delete", { description: e?.message });
    } finally {
      setDeleteTarget(null);
    }
  };

  const activeCount = useMemo(
    () => campaigns.filter((c) => c.status !== "archived").length,
    [campaigns],
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Ads Manager</h1>
              <p className="text-muted-foreground text-sm">
                Plan and manage Google, Facebook &amp; Instagram campaigns in one place.
              </p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> New campaign
          </Button>
        </div>

        {/* Connection + pixel overview (reuses existing infra) */}
        <ConnectionOverview />

        {/* Campaigns */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Campaigns
            </h2>
            {!isLoading && !isError && campaigns.length > 0 && (
              <span className="text-xs text-muted-foreground">{activeCount} active</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[76px] w-full" />
              ))}
            </div>
          ) : isError ? (
            <QueryErrorState
              title="Couldn't load campaigns"
              message="We couldn't reach your ad campaigns. Check your connection and retry."
              onRetry={() => refetch()}
            />
          ) : campaigns.length === 0 ? (
            <div className="border border-dashed border-border">
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Draft your first Google, Facebook, or Instagram ad — save it and publish when your ad account is connected."
                actionLabel="Create your first campaign"
                onAction={openNew}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onEdit={openEdit}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <CampaignBuilderSheet
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editing={editing}
        advertiser={advertiser}
        connectedProviders={connectedProviders}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete "{deleteTarget?.name}"? This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
