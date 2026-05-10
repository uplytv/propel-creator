import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { MerchBundle } from "../hooks/useMerchBundles";

interface Props {
  bundle: MerchBundle;
  onClick?: () => void;
}

export function MerchBundleCard({ bundle, onClick }: Props) {
  const price = (bundle.price_cents / 100).toFixed(2);
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
    >
      <div className="aspect-square bg-muted relative">
        {bundle.image_url ? (
          <img src={bundle.image_url} alt={bundle.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 capitalize">{bundle.bundle_type}</Badge>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-semibold truncate">{bundle.title}</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-primary font-bold">${price}</span>
          {bundle.inventory_count != null && (
            <span className="text-muted-foreground">
              {Math.max(0, bundle.inventory_count - bundle.sold_count)} left
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
