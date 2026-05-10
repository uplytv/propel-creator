import { Calendar, MapPin, Ticket, Star, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { type TourDate, useTourRsvp, useSetTourRsvp } from "../hooks/useTourCalendar";

interface Props {
  tour: TourDate;
  showRsvp?: boolean;
}

export function TourDateCard({ tour, showRsvp = true }: Props) {
  const { data: rsvp } = useTourRsvp(showRsvp ? tour.id : undefined);
  const setRsvp = useSetTourRsvp();
  const date = new Date(tour.starts_at);
  const onSale = tour.on_sale_at ? new Date(tour.on_sale_at) : null;
  const notOnSaleYet = onSale && onSale > new Date();

  const handleRsvp = async (status: "going" | "interested") => {
    const next = rsvp?.status === status ? null : status;
    try {
      await setRsvp.mutateAsync({ tour_date_id: tour.id, status: next });
      toast.success(next ? `Marked as ${next}` : "Removed RSVP");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <article className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex">
        <div className="w-20 sm:w-24 shrink-0 bg-muted flex flex-col items-center justify-center py-3 border-r border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {format(date, "MMM")}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-foreground leading-none">
            {format(date, "d")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {format(date, "EEE · h:mm a")}
          </div>
        </div>
        <div className="flex-1 min-w-0 p-3 space-y-2">
          {tour.tour_name && (
            <div className="text-[10px] uppercase tracking-wider text-primary font-bold">
              {tour.tour_name}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">
              {tour.venue_name}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{tour.city}, {tour.country}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {tour.ticket_url && !notOnSaleYet && (
              <a
                href={tour.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
              >
                <Ticket className="w-3 h-3" /> Tickets
              </a>
            )}
            {notOnSaleYet && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs">
                <Calendar className="w-3 h-3" />
                On sale {format(onSale!, "MMM d")}
              </span>
            )}
            {showRsvp && (
              <>
                <button
                  onClick={() => handleRsvp("going")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    rsvp?.status === "going"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {rsvp?.status === "going" ? <Check className="w-3 h-3" /> : null} Going
                </button>
                <button
                  onClick={() => handleRsvp("interested")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                    rsvp?.status === "interested"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Star className="w-3 h-3" /> Interested
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
