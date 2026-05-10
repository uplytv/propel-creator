import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Disc3 } from "lucide-react";
import type { PreorderCampaign } from "../hooks/usePreorders";

export function PreorderCampaignCard({ campaign, onClick }: { campaign: PreorderCampaign; onClick?: () => void }) {
  const pct = Math.min(100, Math.round((campaign.units_reserved / Math.max(1, campaign.goal_units)) * 100));
  const price = `$${(campaign.price_cents / 100).toFixed(2)}`;
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
    >
      {campaign.cover_url ? (
        <img src={campaign.cover_url} alt={campaign.title} className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
          <Disc3 className="w-12 h-12 text-primary" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{campaign.title}</h3>
          <Badge variant="secondary" className="capitalize">{campaign.format.replace("_", " ")}</Badge>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{campaign.units_reserved}/{campaign.goal_units} reserved</span>
          <span className="font-semibold text-foreground">{price}</span>
        </div>
        {campaign.ships_by && (
          <p className="text-[11px] text-muted-foreground">Ships by {new Date(campaign.ships_by).toLocaleDateString()}</p>
        )}
      </div>
    </Card>
  );
}
