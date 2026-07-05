import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { memberAuthUrl } from "@/lib/memberAuth";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";
import QueryErrorState from "@/components/ui/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, ShoppingBag, Settings } from "lucide-react";
import { toast } from "sonner";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  image_url: string | null;
}

/** products.type → chip label. Schema has no physical/merch type yet. */
const TYPE_LABELS: Record<string, string> = {
  digital: "Digital",
  course: "Course",
  coaching: "Coaching",
  community: "Community",
  merch: "Merch",
  physical: "Merch",
};

function ProductCard({
  product,
  isOwner,
  onBuy,
}: {
  product: StoreProduct;
  isOwner: boolean;
  onBuy: (product: StoreProduct) => void;
}) {
  const price = Number(product.price) || 0;
  const isFree = price <= 0;
  const typeLabel = TYPE_LABELS[product.type] || "Product";

  return (
    <div className="flex flex-col overflow-hidden border border-surface-border bg-surface-raised">
      <div className="relative aspect-square bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-background/85 text-foreground border border-surface-border">
          {typeLabel}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-3 gap-1">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-bold text-foreground">
            {isFree ? "Free" : `$${price.toFixed(2)}`}
          </span>
          {isOwner ? (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Yours
            </span>
          ) : (
            <Button size="sm" className="h-7 text-xs px-3" onClick={() => onBuy(product)}>
              <ShoppingBag className="w-3 h-3 mr-1" />
              {isFree ? "Get" : "Buy"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpaceStoreTab({ creatorId, isOwner }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(null);

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["space-store-products", creatorId],
    enabled: !!creatorId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, type, price, image_url")
        .eq("user_id", creatorId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreProduct[];
    },
  });

  const handleBuy = (product: StoreProduct) => {
    const price = Number(product.price) || 0;
    if (price <= 0) {
      // Free items live inside the space itself (course → classroom, else community).
      navigate(`/community/${creatorId}/${product.type === "course" ? "classroom" : "community"}`);
      return;
    }
    if (!user) {
      // Logged-out buyer → free member signup, then back to this storefront.
      navigate(memberAuthUrl());
      return;
    }
    setCheckoutProduct(product);
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Store{products.length > 0 ? ` · ${products.length}` : ""}
        </h2>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => navigate("/products")}>
            <Settings className="w-4 h-4 mr-1" />
            Manage store
          </Button>
        )}
      </div>

      {/* Error */}
      {isError && (
        <QueryErrorState
          title="Couldn't load the store"
          message="We couldn't load these products right now. Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {/* Loading skeletons */}
      {isLoading && !isError && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-surface-border bg-surface-raised">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-none" />
                <Skeleton className="h-3 w-1/2 rounded-none" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && products.length === 0 && (
        <div className="p-12 text-center border border-surface-border bg-surface-raised">
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-foreground mb-1">No products yet</p>
          {isOwner ? (
            <button
              onClick={() => navigate("/products")}
              className="text-sm text-primary hover:underline"
            >
              Add your first product →
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          )}
        </div>
      )}

      {/* Product grid */}
      {!isLoading && !isError && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} isOwner={isOwner} onBuy={handleBuy} />
          ))}
        </div>
      )}

      {/* Embedded Stripe checkout — same path Products/ViewerShop use for one-off products */}
      {checkoutProduct && (
        <PurchaseOverlay
          isOpen={!!checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={() => {
            setCheckoutProduct(null);
            toast.success("Purchase complete! Your product is ready to access.");
          }}
          purchaseType="product"
          purchaseParams={{
            product_id: checkoutProduct.id,
            creator_id: creatorId,
            purchase_type: checkoutProduct.type === "course" ? "course" : "product",
          }}
          title={checkoutProduct.name}
          description={checkoutProduct.description || undefined}
          price={Number(checkoutProduct.price) || 0}
        />
      )}
    </div>
  );
}
