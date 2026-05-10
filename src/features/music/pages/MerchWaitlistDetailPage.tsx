import { useParams } from "react-router-dom";
import { Calendar, Users } from "lucide-react";
import { useMerchWaitlist } from "../hooks/useMerchWaitlists";
import { MerchWaitlistJoinForm } from "../components/MerchWaitlistJoinForm";

export default function MerchWaitlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: wl, isLoading } = useMerchWaitlist(id);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }
  if (!wl) {
    return <div className="p-4 text-sm text-muted-foreground">Waitlist not found.</div>;
  }

  const launch = wl.launch_at ? new Date(wl.launch_at) : null;
  const isFull = !!wl.max_signups && wl.signup_count >= wl.max_signups;

  return (
    <div className="mobile-safe-content p-4 space-y-4 max-w-xl mx-auto">
      {wl.image_url && (
        <img
          src={wl.image_url}
          alt={wl.product_name}
          className="w-full aspect-square object-cover rounded-2xl"
        />
      )}
      <div>
        <h1 className="text-2xl font-bold">{wl.drop_title}</h1>
        <p className="text-muted-foreground">{wl.product_name}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {launch && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {launch.toLocaleString()}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {wl.signup_count}
          {wl.max_signups ? ` / ${wl.max_signups}` : ""} on waitlist
        </span>
      </div>
      {wl.notes && <p className="text-sm whitespace-pre-line">{wl.notes}</p>}
      {wl.status === "open" ? (
        <MerchWaitlistJoinForm waitlistId={wl.id} full={isFull} />
      ) : (
        <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {wl.status === "launched" ? "This drop has launched." : "This waitlist was canceled."}
        </div>
      )}
    </div>
  );
}
