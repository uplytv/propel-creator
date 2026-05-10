import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Music2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { CrowdfundCampaign } from "../hooks/useCrowdfund";

export function CampaignCard({ campaign }: { campaign: CrowdfundCampaign }) {
  const pct = campaign.goal_cents > 0 ? Math.min(100, Math.round((campaign.raised_cents / campaign.goal_cents) * 100)) : 0;
  return (
    <Link to={`/music/crowdfund/${campaign.id}`}>
      <Card className="overflow-hidden hover:border-primary/50 transition-colors">
        {campaign.cover_url ? (
          <img src={campaign.cover_url} alt={campaign.title} className="w-full aspect-video object-cover" />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Music2 className="w-10 h-10 text-primary" />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold truncate">{campaign.title}</h3>
            <Badge variant={campaign.status === "successful" ? "default" : "secondary"}>{campaign.kind}</Badge>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>${(campaign.raised_cents / 100).toFixed(0)} raised</span>
            <span>{pct}% of ${(campaign.goal_cents / 100).toFixed(0)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
