import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NextUp {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  slug?: string | null;
  creator_username?: string | null;
}

interface Props {
  next: NextUp | null;
  /** countdown seconds before auto-advance */
  countdown?: number;
  /** triggers when the playing video reports `ended` */
  triggered: boolean;
  onCancel?: () => void;
}

export default function NextUpCard({ next, countdown = 8, triggered, onCancel }: Props) {
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(countdown);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!triggered || cancelled || !next) return;
    setRemaining(countdown);
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          const path = next.creator_username && next.slug
            ? `/creator/${encodeURIComponent(next.creator_username)}/videos/${next.slug}`
            : `/v/${next.slug ?? next.id}`;
          navigate(path);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [triggered, cancelled, next, countdown, navigate]);

  if (!triggered || !next || cancelled) return null;

  return (
    <div className="rounded-xl border border-primary/40 bg-card/95 backdrop-blur-sm p-3 flex items-center gap-3 shadow-lg">
      {next.thumbnail_url ? (
        <img src={next.thumbnail_url} alt="" loading="lazy" className="w-20 h-12 object-cover rounded-md shrink-0" />
      ) : (
        <div className="w-20 h-12 bg-secondary rounded-md flex items-center justify-center shrink-0">
          <Play className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
          Up next in {remaining}s
        </p>
        <p className="text-sm font-semibold text-foreground line-clamp-1">{next.title}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setCancelled(true);
          onCancel?.();
        }}
        aria-label="Cancel autoplay"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
