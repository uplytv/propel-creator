import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCampaignTiers, usePledge, type CrowdfundCampaign } from "../hooks/useCrowdfund";
import { PledgeTierCard } from "../components/PledgeTierCard";

export default function CrowdfundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pledge = usePledge();

  const campaign = useQuery({
    queryKey: ["cfund", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_crowdfund_campaigns")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CrowdfundCampaign | null;
    },
  });
  const tiers = useCampaignTiers(id);

  if (campaign.isLoading) return <div className="container py-6">Loading…</div>;
  if (!campaign.data) return <div className="container py-6">Campaign not found.</div>;

  const c = campaign.data;
  const pct = c.goal_cents > 0 ? Math.min(100, Math.round((c.raised_cents / c.goal_cents) * 100)) : 0;

  return (
    <div className="container max-w-3xl py-6 space-y-6 mobile-safe-content">
      <Card className="overflow-hidden">
        {c.cover_url && <img src={c.cover_url} alt={c.title} className="w-full aspect-video object-cover" />}
        <div className="p-4 space-y-3">
          <h1 className="text-2xl font-bold">{c.title}</h1>
          {c.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{c.description}</p>}
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">${(c.raised_cents / 100).toFixed(0)}</span>
            <span className="text-muted-foreground">{pct}% of ${(c.goal_cents / 100).toFixed(0)}</span>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Backer tiers</h2>
        {tiers.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tiers…</p>
        ) : !tiers.data?.length ? (
          <p className="text-sm text-muted-foreground">No tiers yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiers.data.map((t) => (
              <PledgeTierCard
                key={t.id}
                tier={t}
                onPledge={(tier) => pledge.mutate({ campaign: c, tier })}
                pledging={pledge.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
