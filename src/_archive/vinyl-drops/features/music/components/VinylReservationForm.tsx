import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  type VinylDrop,
  useMyVinylReservation,
  useReserveVinyl,
  useCancelVinylReservation,
} from "../hooks/useVinylDrops";

interface Props {
  drop: VinylDrop;
}

export function VinylReservationForm({ drop }: Props) {
  const { data: reservation } = useMyVinylReservation(drop.id);
  const reserve = useReserveVinyl();
  const cancel = useCancelVinylReservation();
  const [qty, setQty] = useState<number>(reservation?.quantity ?? 1);

  const isActive = reservation && reservation.status !== "canceled";
  const canReserve = drop.status === "preorder" || drop.status === "announced";
  const isSoldOut = drop.status === "soldout" ||
    (drop.edition_size > 0 && drop.reserved_count >= drop.edition_size);

  const onReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reserve.mutateAsync({ dropId: drop.id, quantity: Math.max(1, qty) });
      toast.success("Vinyl reserved");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to reserve");
    }
  };

  const onCancel = async () => {
    try {
      await cancel.mutateAsync(drop.id);
      toast.success("Reservation canceled");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to cancel");
    }
  };

  if (isSoldOut && !isActive) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
        This vinyl is sold out.
      </div>
    );
  }

  if (!canReserve && !isActive) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
        Pre-orders aren't open yet.
      </div>
    );
  }

  return (
    <form onSubmit={onReserve} className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="vinyl-qty">Quantity</Label>
        <Input
          id="vinyl-qty"
          type="number"
          min={1}
          max={5}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value) || 1)}
          className="text-base"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          className="min-h-11 w-full"
          disabled={reserve.isPending || isSoldOut}
        >
          {reserve.isPending
            ? "Reserving..."
            : isActive
            ? "Update reservation"
            : "Reserve vinyl"}
        </Button>
        {isActive && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={onCancel}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? "Canceling..." : "Cancel reservation"}
          </Button>
        )}
      </div>
      {isActive && (
        <p className="text-center text-xs text-muted-foreground">
          Status: <span className="font-medium text-foreground">{reservation!.status}</span>
        </p>
      )}
    </form>
  );
}
