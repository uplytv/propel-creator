import { memo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, ShoppingBag } from "lucide-react";
import type { MerchWaitlist } from "../hooks/useMerchWaitlists";

interface Props {
  waitlist: MerchWaitlist;
  to?: string;
}

function MerchWaitlistCardImpl({ waitlist, to }: Props) {
  const launch = waitlist.launch_at ? new Date(waitlist.launch_at) : null;
  const pct = waitlist.max_signups
    ? Math.min(100, Math.round((waitlist.signup_count / waitlist.max_signups) * 100))
    : null;

  const inner = (
    <div className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors">
      <div className="flex gap-3">
        {waitlist.image_url ? (
          <img
            src={waitlist.image_url}
            alt={waitlist.product_name}
            loading="lazy"
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{waitlist.drop_title}</h3>
          <p className="text-sm text-muted-foreground truncate">{waitlist.product_name}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {launch && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {launch.toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {waitlist.signup_count}
              {waitlist.max_signups ? ` / ${waitlist.max_signups}` : ""}
            </span>
          </div>
          {pct !== null && (
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

export const MerchWaitlistCard = memo(MerchWaitlistCardImpl);
