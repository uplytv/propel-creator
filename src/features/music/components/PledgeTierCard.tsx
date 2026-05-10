import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CrowdfundTier } from "../hooks/useCrowdfund";

interface Props {
  tier: CrowdfundTier;
  onPledge?: (tier: CrowdfundTier) => void;
  pledging?: boolean;
}

export function PledgeTierCard({ tier, onPledge, pledging }: Props) {
  const soldOut = tier.limit_count != null && tier.claimed_count >= tier.limit_count;
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{tier.title}</h4>
        <span className="font-bold">${(tier.pledge_cents / 100).toFixed(0)}</span>
      </div>
      {tier.description && <p className="text-xs text-muted-foreground">{tier.description}</p>}
      {tier.perks && <p className="text-xs">{tier.perks}</p>}
      <div className="flex items-center justify-between pt-1">
        {tier.limit_count != null ? (
          <Badge variant="outline">{tier.claimed_count}/{tier.limit_count} claimed</Badge>
        ) : <span />}
        {onPledge && (
          <Button size="sm" disabled={soldOut || pledging} onClick={() => onPledge(tier)}>
            {soldOut ? "Sold out" : pledging ? "Pledging..." : "Back this"}
          </Button>
        )}
      </div>
    </Card>
  );
}
