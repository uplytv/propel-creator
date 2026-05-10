import { memo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Disc3 } from "lucide-react";
import type { PresaveCampaign } from "../hooks/usePresaveCampaigns";

interface Props {
  campaign: PresaveCampaign;
  to?: string;
}

function PresaveCampaignCardImpl({ campaign, to }: Props) {
  const release = new Date(campaign.release_date);
  const released = campaign.status !== "active";
  const inner = (
    <div className="rounded-xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors">
      <div className="flex gap-3">
        {campaign.artwork_url ? (
          <img
            src={campaign.artwork_url}
            alt={campaign.release_title}
            loading="lazy"
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
            <Disc3 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold truncate">{campaign.release_title}</h3>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                released ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
              }`}
            >
              {campaign.status === "released" ? "out now" : campaign.status}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {release.toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign.presave_count} pre-saved
            </span>
          </div>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export const PresaveCampaignCard = memo(PresaveCampaignCardImpl);
