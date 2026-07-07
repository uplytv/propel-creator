import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Package, Download, GraduationCap, ExternalLink, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import type { ReceiptData } from "./ReceiptSheet";

const TYPE_LABELS: Record<string, string> = {
  digital: "Digital",
  course: "Course",
  coaching: "Coaching",
  community: "Community",
  merch: "Merch",
  physical: "Merch",
};

interface PurchaseRow {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  stripe_payment_intent_id: string | null;
  product_id: string;
  creator_id: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    type: string;
    download_url: string | null;
  } | null;
  creator: { user_id: string; display_name: string | null; username: string | null } | null;
}

export default function ProductPurchasesSection({
  onReceipt,
}: {
  onReceipt: (r: ReceiptData) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: purchases, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchases-products", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PurchaseRow[]> => {
      const { data: rows, error } = await supabase
        .from("product_purchases")
        .select("id, amount, created_at, status, stripe_payment_intent_id, product_id, creator_id")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const productIds = [...new Set((rows || []).map((r: any) => r.product_id))];
      const creatorIds = [...new Set((rows || []).map((r: any) => r.creator_id))];

      const [productsRes, profilesRes] = await Promise.all([
        productIds.length
          ? supabase
              .from("products")
              .select("id, name, image_url, type, download_url")
              .in("id", productIds)
          : Promise.resolve({ data: [] }),
        creatorIds.length
          ? supabase
              .from("profiles")
              .select("user_id, display_name, username")
              .in("user_id", creatorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const productMap = Object.fromEntries(
        ((productsRes.data as any[]) || []).map((p) => [p.id, p]),
      );
      const profileMap = Object.fromEntries(
        ((profilesRes.data as any[]) || []).map((p) => [p.user_id, p]),
      );

      return ((rows as any[]) || []).map((r) => ({
        ...r,
        product: productMap[r.product_id] || null,
        creator: profileMap[r.creator_id] || null,
      }));
    },
  });

  const handleAccess = async (row: PurchaseRow) => {
    const type = row.product?.type;
    if (type === "course") {
      navigate(`/community/${row.creator_id}/classroom`);
      return;
    }
    if (type === "digital") {
      setDownloadingId(row.id);
      try {
        const { data, error } = await supabase.functions.invoke("get-product-download", {
          body: { product_id: row.product_id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.url) throw new Error("No download link returned");
        window.open(data.url, "_blank");
      } catch (err: any) {
        toast.error("Couldn't get your download", {
          description: err?.message || "Please try again in a moment.",
        });
      } finally {
        setDownloadingId(null);
      }
      return;
    }
    // Coaching / community / merch — take the buyer back to the creator's storefront
    navigate(`/community/${row.creator_id}/store`);
  };

  const handleReceipt = (row: PurchaseRow) => {
    const typeLabel = TYPE_LABELS[row.product?.type || ""] || "Product";
    onReceipt({
      kind: "product",
      kindLabel: typeLabel === "Course" ? "Course" : `${typeLabel} product`,
      title: row.product?.name || "Product (no longer listed)",
      creatorName: row.creator?.display_name || row.creator?.username || null,
      purchasedAt: row.created_at,
      amount: Number(row.amount) || 0,
      status: row.status,
      paymentRef: row.stripe_payment_intent_id,
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
        Products{purchases?.length ? ` · ${purchases.length}` : ""}
      </h2>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
      )}

      {isError && (
        <QueryErrorState
          title="Couldn't load your products"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (purchases || []).length === 0 && (
        <div className="border border-surface-border bg-surface-raised">
          <EmptyState
            icon={Package}
            title="Nothing here yet"
            description="Products and courses you buy from creators will show up here."
            actionLabel="Discover creators"
            onAction={() => navigate("/discover")}
          />
        </div>
      )}

      {!isLoading && !isError && (purchases || []).length > 0 && (
        <ul className="space-y-3">
          {(purchases || []).map((row) => {
            const isCourse = row.product?.type === "course";
            const isDigital = row.product?.type === "digital";
            const isDownloading = downloadingId === row.id;
            return (
              <li
                key={row.id}
                className="flex gap-3 p-3 border border-surface-border bg-surface-raised"
              >
                <div className="w-16 h-16 flex-shrink-0 bg-secondary overflow-hidden">
                  {row.product?.image_url ? (
                    <img
                      src={row.product.image_url}
                      alt={row.product?.name || "Product"}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {row.product?.name || "Product (no longer listed)"}
                    </h3>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-surface-border text-muted-foreground flex-shrink-0">
                      {TYPE_LABELS[row.product?.type || ""] || "Product"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {row.creator?.display_name || row.creator?.username || "Creator"} ·{" "}
                    {format(new Date(row.created_at), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {Number(row.amount) > 0 ? `$${Number(row.amount).toFixed(2)}` : "Free"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleAccess(row)}
                      disabled={isDownloading || (isDigital && !row.product?.download_url)}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isCourse ? (
                        <GraduationCap className="w-3.5 h-3.5" />
                      ) : isDigital ? (
                        <Download className="w-3.5 h-3.5" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      {isCourse ? "Open classroom" : isDigital ? "Download" : "View store"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1.5 text-muted-foreground"
                      onClick={() => handleReceipt(row)}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
