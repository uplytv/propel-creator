import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, CheckCircle2, Users } from "lucide-react";
import { useListeningSessions } from "../hooks/useListeningStats";

interface Props {
  artistId: string;
}

export function ListeningStatsCard({ artistId }: Props) {
  const { data: sessions = [], isLoading } = useListeningSessions(artistId);

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const completed = sessions.filter((s) => s.completed).length;
  const uniqueFans = new Set(sessions.map((s) => s.fan_id)).size;

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  return (
    <Card className="bg-card/40 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Headphones className="w-4 h-4 text-primary" />
          Listening Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Listen time</div>
          <div className="text-lg font-semibold">
            {isLoading ? "—" : `${hours}h ${mins}m`}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </div>
          <div className="text-lg font-semibold">{isLoading ? "—" : completed}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> Fans
          </div>
          <div className="text-lg font-semibold">{isLoading ? "—" : uniqueFans}</div>
        </div>
      </CardContent>
    </Card>
  );
}
