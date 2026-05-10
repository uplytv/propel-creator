import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, MapPin, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import type { Carpool } from "../hooks/useCarpools";
import { useJoinCarpool } from "../hooks/useCarpools";
import { useToast } from "@/hooks/use-toast";

export function CarpoolCard({ carpool }: { carpool: Carpool }) {
  const join = useJoinCarpool();
  const { toast } = useToast();
  const seatsLeft = Math.max(0, carpool.total_seats - carpool.seats_taken);
  const disabled = carpool.status !== "open" || join.isPending || seatsLeft === 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Car className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-semibold">{carpool.concert_label}</div>
            {carpool.concert_date && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(carpool.concert_date), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </div>
        <Badge variant={carpool.status === "open" ? "default" : "secondary"} className="capitalize">
          {carpool.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-1 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">
            {carpool.origin_city}
            {carpool.meeting_point ? ` · ${carpool.meeting_point}` : ""}
          </span>
        </div>
        {carpool.departure_time && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(carpool.departure_time), "EEE, MMM d · h:mm a")}
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {seatsLeft} of {carpool.total_seats} seats left
        </div>
      </div>

      {carpool.contact_note && (
        <p className="text-xs text-muted-foreground italic">"{carpool.contact_note}"</p>
      )}

      <Button
        className="w-full min-h-11"
        disabled={disabled}
        onClick={async () => {
          try {
            await join.mutateAsync({ carpool_id: carpool.id });
            toast({ title: "Ride request sent" });
          } catch (e: any) {
            toast({ title: "Failed", description: e.message, variant: "destructive" });
          }
        }}
      >
        {seatsLeft === 0 ? "Full" : "Request a seat"}
      </Button>
    </Card>
  );
}
