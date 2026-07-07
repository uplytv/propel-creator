import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Ticket, Receipt, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import type { ReceiptData } from "./ReceiptSheet";

interface TicketRow {
  id: string;
  qr_code_token: string;
  status: string;
  amount_paid: number;
  created_at: string;
  purchased_from: string | null;
  stripe_payment_intent_id: string | null;
  ticket_tiers: { name: string } | null;
  events: {
    id: string;
    title: string;
    starts_at: string;
    location_name: string | null;
    cover_image_url: string | null;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  active: "border-primary/40 text-primary",
  used: "border-surface-border text-muted-foreground",
  refunded: "border-destructive/40 text-destructive",
  canceled: "border-destructive/40 text-destructive",
  resold: "border-surface-border text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  used: "Checked in",
  refunded: "Refunded",
  canceled: "Canceled",
  resold: "Resold",
};

export default function TicketPurchasesSection({
  onReceipt,
}: {
  onReceipt: (r: ReceiptData) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: tickets, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchases-tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<TicketRow[]> => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, qr_code_token, status, amount_paid, created_at, purchased_from, stripe_payment_intent_id, ticket_tiers:tier_id(name), events:event_id(id,title,starts_at,location_name,cover_image_url)",
        )
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TicketRow[];
    },
  });

  const handleReceipt = (t: TicketRow) => {
    const extraRows: { label: string; value: string }[] = [];
    if (t.events?.starts_at) {
      extraRows.push({
        label: "Event date",
        value: format(new Date(t.events.starts_at), "EEE MMM d, yyyy · h:mm a"),
      });
    }
    if (t.ticket_tiers?.name) extraRows.push({ label: "Tier", value: t.ticket_tiers.name });
    if (t.purchased_from === "resale") extraRows.push({ label: "Source", value: "Resale" });
    onReceipt({
      kind: "ticket",
      kindLabel: "Event ticket",
      title: t.events?.title || "Event",
      creatorName: null,
      purchasedAt: t.created_at,
      amount: Number(t.amount_paid) || 0,
      status: STATUS_LABELS[t.status] || t.status,
      paymentRef: t.stripe_payment_intent_id || t.qr_code_token,
      extraRows,
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
        Tickets{tickets?.length ? ` · ${tickets.length}` : ""}
      </h2>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-none" />
          ))}
        </div>
      )}

      {isError && (
        <QueryErrorState title="Couldn't load your tickets" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && (tickets || []).length === 0 && (
        <div className="border border-surface-border bg-surface-raised">
          <EmptyState
            icon={Ticket}
            title="Nothing here yet"
            description="Tickets you buy or claim will show up here."
            actionLabel="Browse events"
            onAction={() => navigate("/events")}
          />
        </div>
      )}

      {!isLoading && !isError && (tickets || []).length > 0 && (
        <ul className="space-y-3">
          {(tickets || []).map((t) => (
            <li key={t.id} className="flex gap-3 p-3 border border-surface-border bg-surface-raised">
              <div className="w-16 h-16 flex-shrink-0 bg-secondary overflow-hidden">
                {t.events?.cover_image_url ? (
                  <img
                    src={t.events.cover_image_url}
                    alt={t.events?.title || "Event"}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {t.events?.title || "Event"}
                  </h3>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${
                      STATUS_STYLES[t.status] || "border-surface-border text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  {t.purchased_from === "resale" && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-surface-border text-muted-foreground flex-shrink-0">
                      Resale
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {t.events?.starts_at
                    ? format(new Date(t.events.starts_at), "EEE MMM d, yyyy · h:mm a")
                    : "Date TBA"}
                  {t.ticket_tiers?.name ? ` · ${t.ticket_tiers.name}` : ""}
                </p>
                <p className="text-xs font-bold text-foreground mt-0.5">
                  {Number(t.amount_paid) > 0 ? `$${Number(t.amount_paid).toFixed(2)}` : "Free"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => navigate(`/tickets/${t.qr_code_token}`)}
                  >
                    View ticket
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1.5 text-muted-foreground"
                    onClick={() => handleReceipt(t)}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Receipt
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
