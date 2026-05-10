import { Lock, Music, Video, Image as ImageIcon, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFanClubExclusives, useHasFanClubAccess, type FanClubExclusive } from "../hooks/useFanClub";

const ICONS = {
  post: FileText,
  audio: Music,
  video: Video,
  image: ImageIcon,
};

function ExclusiveCard({ artistId, item }: { artistId: string; item: FanClubExclusive }) {
  const { data: hasAccess } = useHasFanClubAccess(artistId, item.min_tier_id);
  const Icon = ICONS[item.kind];
  const locked = !hasAccess;

  return (
    <Card className="overflow-hidden bg-card/50 border-border">
      {item.thumbnail_url && (
        <div className="relative aspect-video bg-muted">
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className={`w-full h-full object-cover ${locked ? "blur-md" : ""}`}
            loading="lazy"
          />
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          )}
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <Badge variant="outline" className="text-xs uppercase">
            {item.kind}
          </Badge>
          {locked && (
            <Badge className="ml-auto bg-primary/20 text-primary text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Members only
            </Badge>
          )}
        </div>
        <h4 className="font-semibold">{item.title}</h4>
        {!locked && item.body && (
          <p className="text-sm text-muted-foreground line-clamp-3">{item.body}</p>
        )}
        {locked && (
          <p className="text-sm text-muted-foreground">
            Subscribe to unlock this exclusive content
          </p>
        )}
      </div>
    </Card>
  );
}

export function FanClubExclusivesFeed({ artistId }: { artistId: string }) {
  const { data: items = [], isLoading } = useFanClubExclusives(artistId);
  if (isLoading) return null;
  if (!items.length) {
    return (
      <Card className="p-6 text-center text-muted-foreground bg-card/50">
        No exclusive content posted yet
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <ExclusiveCard key={item.id} artistId={artistId} item={item} />
      ))}
    </div>
  );
}
