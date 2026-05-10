import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import {
  useMyMerchReservation,
  useReserveMerchDrop,
  useCancelMerchReservation,
  type MerchDrop,
} from "../hooks/useMerchDrops";

interface Props {
  drop: MerchDrop;
}

export function MerchDropReserveButton({ drop }: Props) {
  const { data: reservation } = useMyMerchReservation(drop.id);
  const reserve = useReserveMerchDrop();
  const cancel = useCancelMerchReservation();

  const disabled =
    drop.status === "ended" ||
    drop.status === "cancelled" ||
    drop.status === "sold_out" ||
    drop.stock_remaining <= 0;

  if (reservation) {
    return (
      <Button
        variant="outline"
        className="w-full min-h-[44px]"
        onClick={() => cancel.mutate(reservation.id)}
        disabled={cancel.isPending}
      >
        {cancel.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <X className="w-4 h-4 mr-2" />
        )}
        Cancel reservation ({reservation.quantity})
      </Button>
    );
  }

  return (
    <Button
      className="w-full min-h-[44px]"
      onClick={() => reserve.mutate({ drop_id: drop.id, quantity: 1 })}
      disabled={disabled || reserve.isPending}
    >
      {reserve.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Check className="w-4 h-4 mr-2" />
      )}
      {disabled ? "Unavailable" : "Reserve"}
    </Button>
  );
}
