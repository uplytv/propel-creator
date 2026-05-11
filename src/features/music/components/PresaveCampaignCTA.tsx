import { Link } from "react-router-dom";
import { Disc3 } from "lucide-react";
import { usePresaveCampaign } from "../hooks/usePresaveCampaign";
import { Button } from "@/components/ui/button";

export default function PresaveCampaignCTA({ trackId }: { trackId: string }) {
  const { data: campaign } = usePresaveCampaign(trackId);
  const exists = !!campaign;
  return (
    <section className="mt-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Disc3 className="h-5 w-5 text-primary" />
        <div>
          <div className="text-sm font-semibold text-white">
            {exists ? "Pre-save campaign" : "Set up pre-save campaign"}
          </div>
          <div className="text-xs text-white/60">
            {exists
              ? `Status: ${campaign?.status}`
              : "Drive fans to pre-save before release day."}
          </div>
        </div>
      </div>
      <Link to={`/music/track/${trackId}/presave/setup`}>
        <Button size="sm" variant={exists ? "outline" : "default"}>
          {exists ? "Manage" : "Set up"}
        </Button>
      </Link>
    </section>
  );
}
