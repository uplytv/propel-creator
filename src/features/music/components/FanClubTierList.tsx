import { Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  useFanClubTiers,
  useMyFanClubSubscription,
  useSubscribeToTier,
  type FanClubTier,
} from "../hooks/useFanClub";

export function FanClubTierList({ artistId }: { artistId: string }) {
  const { data: tiers = [], isLoading } = useFanClubTiers(artistId);
  const { data: mySub } = useMyFanClubSubscription(artistId);
  const subscribe = useSubscribeToTier();

  const fmt = (cents: number, cur: string) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(cents / 100);

  const handleSubscribe = async (tier: FanClubTier) => {
    try {
      const res = await subscribe.mutateAsync({ tierId: tier.id, artistId });
      if (!res.redirected) toast({ title: "Welcome to the fan club!", description: `You joined ${tier.name}` });
    } catch (e: any) {
      toast({ title: "Couldn't subscribe", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tiers.length) {
    return (
      <Card className="p-6 text-center text-muted-foreground bg-card/50">
        No fan club tiers yet
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tiers.map((tier) => {
        const isCurrent = mySub?.tier_id === tier.id;
        return (
          <Card
            key={tier.id}
            className="p-5 space-y-4 bg-card/50 border-border relative overflow-hidden"
          >
            {isCurrent && (
              <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                Current
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{tier.name}</h3>
            </div>
            <p className="text-2xl font-bold">
              {fmt(tier.price_cents, tier.currency)}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            {tier.description && (
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            )}
            {Array.isArray(tier.perks) && tier.perks.length > 0 && (
              <ul className="space-y-1.5">
                {tier.perks.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button
              className="w-full min-h-11"
              variant={isCurrent ? "outline" : "default"}
              disabled={isCurrent || subscribe.isPending}
              onClick={() => handleSubscribe(tier)}
            >
              {isCurrent ? "Subscribed" : subscribe.isPending ? "Redirecting..." : "Join tier"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
