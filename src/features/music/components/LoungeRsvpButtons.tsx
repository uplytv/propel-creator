import { Button } from "@/components/ui/button";
import { Check, HelpCircle, X } from "lucide-react";
import { useMyLoungeRsvp, useSetLoungeRsvp, type RsvpStatus } from "../hooks/useListeningLounges";

export function LoungeRsvpButtons({ loungeId }: { loungeId: string }) {
  const { data: rsvp } = useMyLoungeRsvp(loungeId);
  const setRsvp = useSetLoungeRsvp();

  const current = rsvp?.status as RsvpStatus | undefined;

  const Btn = ({ status, icon: Icon, label }: { status: RsvpStatus; icon: typeof Check; label: string }) => (
    <Button
      type="button"
      size="sm"
      variant={current === status ? "default" : "outline"}
      disabled={setRsvp.isPending}
      onClick={() => setRsvp.mutate({ lounge_id: loungeId, status })}
      className="min-h-[44px] flex-1"
    >
      <Icon className="mr-2 h-4 w-4" aria-hidden />
      {label}
    </Button>
  );

  return (
    <div className="flex w-full gap-2">
      <Btn status="going" icon={Check} label="Going" />
      <Btn status="maybe" icon={HelpCircle} label="Maybe" />
      <Btn status="canceled" icon={X} label="Skip" />
    </div>
  );
}
