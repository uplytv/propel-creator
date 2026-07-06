import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import ProductPurchasesSection from "@/components/purchases/ProductPurchasesSection";
import TicketPurchasesSection from "@/components/purchases/TicketPurchasesSection";
import MembershipsSection from "@/components/purchases/MembershipsSection";
import PlatformPlanSection from "@/components/purchases/PlatformPlanSection";
import ReceiptSheet, { type ReceiptData } from "@/components/purchases/ReceiptSheet";

type FilterKey = "all" | "products" | "tickets" | "memberships" | "subscriptions";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "products", label: "Products" },
  { key: "tickets", label: "Tickets" },
  { key: "memberships", label: "Memberships" },
  { key: "subscriptions", label: "Subscriptions" },
];

/**
 * Unified buyer purchases page — everything a user has bought on UPLY in one
 * place: one-off products & courses, event tickets, creator memberships, and
 * the UPLY platform plan. Each line item opens a print-friendly receipt.
 */
export default function Purchases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Sign in to view your purchases
          </h1>
          <Button onClick={() => navigate("/auth?redirect=/purchases")}>Sign in</Button>
        </div>
      </AppLayout>
    );
  }

  const show = (key: Exclude<FilterKey, "all">) => filter === "all" || filter === key;

  return (
    <AppLayout>
      <SEOHead
        title="My Purchases · UPLY"
        description="Everything you've bought on UPLY — products, tickets, memberships, and receipts in one place."
      />
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            My Purchases
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Everything you've bought, with receipts — in one place.
          </p>
        </header>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                filter === f.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface-raised text-muted-foreground border-surface-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {show("products") && <ProductPurchasesSection onReceipt={setReceipt} />}
          {show("tickets") && <TicketPurchasesSection onReceipt={setReceipt} />}
          {show("memberships") && <MembershipsSection onReceipt={setReceipt} />}
          {show("subscriptions") && <PlatformPlanSection />}
        </div>
      </div>

      <ReceiptSheet receipt={receipt} onClose={() => setReceipt(null)} />
    </AppLayout>
  );
}
