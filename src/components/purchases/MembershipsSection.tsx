import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Receipt, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import { useBillingPortal } from "./useBillingPortal";
import type { ReceiptData } from "./ReceiptSheet";

interface MembershipRow {
  id: string;
  creator_id: string;
  status: string;
  created_at: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  subscription_tiers: { name: string; price_monthly: number } | null;
  creator_profile: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: "border-primary/40 text-primary",
  canceled: "border-destructive/40 text-destructive",
  past_due: "border-yellow-500/40 text-yellow-600",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  canceled: "Canceled",
  past_due: "Past due",
};

export default function MembershipsSection({
  onReceipt,
}: {
  onReceipt: (r: ReceiptData) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openPortal, portalLoading } = useBillingPortal();

  const { data: memberships, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchases-memberships", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MembershipRow[]> => {
      const { data, error } = await supabase
        .from("member_subscriptions")
        .select(
          "id, creator_id, status, created_at, current_period_end, stripe_subscription_id, subscription_tiers(name, price_monthly)",
        )
        .eq("member_id", user!.id)
        .in("status", ["active", "canceled", "past_due"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const creatorIds = [...new Set((data || []).map((s: any) => s.creator_id))];
      const { data: profiles } = creatorIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", creatorIds)
        : { data: [] };

      const profileMap = Object.fromEntries(
        ((profiles as any[]) || []).map((p) => [p.user_id, p]),
      );

      return ((data as any[]) || []).map((s) => ({
        ...s,
        creator_profile: profileMap[s.creator_id] || null,
      }));
    },
  });

  const handleReceipt = (m: MembershipRow) => {
    const extraRows: { label: string; value: string }[] = [];
    if (m.current_period_end) {
      extraRows.push({
        label: m.status === "active" ? "Renews" : "Expires",
        value: format(new Date(m.current_period_end), "MMM d, yyyy"),
      });
    }
    onReceipt({
      kind: "membership",
      kindLabel: "Membership",
      title: m.subscription_tiers?.name || "Membership",
      creatorName: m.creator_profile?.display_name || m.creator_profile?.username || null,
      purchasedAt: m.created_at,
      amount: Number(m.subscription_tiers?.price_monthly) || 0,
      status: STATUS_LABELS[m.status] || m.status,
      paymentRef: m.stripe_subscription_id,
      extraRows: [{ label: "Billing", value: "Monthly" }, ...extraRows],
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
        Memberships{memberships?.length ? ` · ${memberships.length}` : ""}
      </h2>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
      )}

      {isError && (
        <QueryErrorState title="Couldn't load your memberships" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && (memberships || []).length === 0 && (
        <div className="border border-surface-border bg-surface-raised">
          <EmptyState
            icon={Users}
            title="Nothing here yet"
            description="When you join a creator's community, your membership will show up here."
            actionLabel="Discover communities"
            onAction={() => navigate("/discover")}
          />
        </div>
      )}

      {!isLoading && !isError && (memberships || []).length > 0 && (
        <ul className="space-y-3">
          {(memberships || []).map((m) => {
            const creator = m.creator_profile;
            const tier = m.subscription_tiers;
            return (
              <li key={m.id} className="flex gap-3 p-3 border border-surface-border bg-surface-raised">
                <div className="w-12 h-12 flex-shrink-0 bg-secondary overflow-hidden">
                  {creator?.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator?.display_name || "Creator"}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {(creator?.display_name || "C").charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {creator?.display_name || creator?.username || "Creator"}
                    </h3>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${
                        STATUS_STYLES[m.status] || "border-surface-border text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[m.status] || m.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {tier?.name || "Membership"} · ${Number(tier?.price_monthly || 0)}/mo
                  </p>
                  {m.current_period_end && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {m.status === "active" ? "Renews" : "Expires"}{" "}
                      {format(new Date(m.current_period_end), "MMM d, yyyy")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={openPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5" />
                      )}
                      Manage
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1.5 text-muted-foreground"
                      onClick={() => handleReceipt(m)}
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

      {!isLoading && !isError && (memberships || []).length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Manage opens the Stripe billing portal — update payment methods, cancel, or view invoices.
        </p>
      )}
    </section>
  );
}
