import { format } from "date-fns";
import { Printer } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** One purchased line item rendered as a v1 receipt/invoice. */
export interface ReceiptData {
  kind: "product" | "ticket" | "membership";
  /** e.g. "Digital product", "Course", "Event ticket", "Membership" */
  kindLabel: string;
  title: string;
  creatorName?: string | null;
  /** ISO date of purchase */
  purchasedAt: string;
  /** USD dollars */
  amount: number;
  status: string;
  /** Stripe payment intent / subscription id — shown truncated */
  paymentRef?: string | null;
  extraRows?: { label: string; value: string }[];
}

export function truncateRef(ref?: string | null): string | null {
  if (!ref) return null;
  if (ref.length <= 16) return ref;
  return `${ref.slice(0, 10)}…${ref.slice(-4)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-surface-border last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right break-all">{value}</span>
    </div>
  );
}

/**
 * Slide-over receipt with a print-friendly view. On print, everything except
 * the receipt body is hidden and the sheet chrome (transform/fixed sizing)
 * is neutralized so the receipt lays out on the printed page.
 */
export default function ReceiptSheet({
  receipt,
  onClose,
}: {
  receipt: ReceiptData | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!receipt} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        data-uply-receipt-host=""
        className="w-full sm:max-w-md overflow-y-auto rounded-none"
      >
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            [data-uply-receipt], [data-uply-receipt] * { visibility: visible !important; }
            [data-uply-receipt-host] {
              position: static !important;
              transform: none !important;
              width: auto !important;
              max-width: none !important;
              height: auto !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
            }
            [data-uply-receipt] {
              position: absolute !important;
              left: 0; top: 0;
              width: 100%;
              padding: 24px;
              background: #fff !important;
              color: #000 !important;
            }
          }
        `}</style>
        {receipt && (
          <div className="flex flex-col gap-5">
            <SheetHeader className="text-left">
              <SheetTitle className="text-lg font-bold">Receipt</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                A record of this purchase. Use Print for a paper or PDF copy.
              </SheetDescription>
            </SheetHeader>

            <div data-uply-receipt="" className="border border-surface-border bg-surface-raised p-5">
              {/* Letterhead */}
              <div className="flex items-baseline justify-between pb-4 border-b border-surface-border">
                <span className="text-base font-extrabold tracking-tight text-foreground">UPLY</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Purchase receipt
                </span>
              </div>

              {/* What was bought */}
              <div className="py-4 border-b border-surface-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {receipt.kindLabel}
                </p>
                <p className="text-base font-bold text-foreground leading-snug">{receipt.title}</p>
                {receipt.creatorName && (
                  <p className="text-xs text-muted-foreground mt-1">Sold by {receipt.creatorName}</p>
                )}
              </div>

              {/* Line details */}
              <div className="py-2">
                <Row label="Date" value={format(new Date(receipt.purchasedAt), "MMM d, yyyy · h:mm a")} />
                <Row
                  label="Amount"
                  value={receipt.amount > 0 ? `$${receipt.amount.toFixed(2)} USD` : "Free"}
                />
                <Row
                  label="Status"
                  value={receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1).replace(/_/g, " ")}
                />
                {(receipt.extraRows || []).map((row) => (
                  <Row key={row.label} label={row.label} value={row.value} />
                ))}
                {truncateRef(receipt.paymentRef) && (
                  <Row label="Payment ref" value={truncateRef(receipt.paymentRef)!} />
                )}
              </div>

              <p className="pt-4 text-[10px] leading-relaxed text-muted-foreground border-t border-surface-border">
                Payments are processed securely by Stripe. For billing questions, contact the creator
                or reply to your purchase confirmation email.
              </p>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Print receipt
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
