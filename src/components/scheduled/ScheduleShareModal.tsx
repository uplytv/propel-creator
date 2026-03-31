import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScheduleShareModalProps {
  open: boolean;
  onClose: () => void;
  stream: {
    title: string;
    scheduled_at: string;
    category?: string;
  };
  creator: {
    display_name: string;
    username: string;
    channel_category?: string;
  };
}

export default function ScheduleShareModal({ open, onClose, stream, creator }: ScheduleShareModalProps) {
  const dateObj = new Date(stream.scheduled_at);
  const dayStr = format(dateObj, "EEEE");
  const dateStr = format(dateObj, "EEEE, MMMM d");
  const timeStr = format(dateObj, "h:mm a") + " ET";
  const profileUrl = `https://uply.tv/${creator.username}`;
  const hashtag = creator.channel_category ? `#${creator.channel_category}` : "";

  const tweetText = `I'm going live on @uplyTV ${dayStr} at ${timeStr}\n\n${stream.title}\n\nSet a reminder and watch live 👉 ${profileUrl}\n\n#UPLY ${hashtag}`.trim();

  const nativeText = `${creator.display_name} is going live on UPLY — ${stream.title} — ${dateStr} at ${timeStr}. Watch here: ${profileUrl}`;

  const handleShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${creator.display_name} is going live on UPLY`,
          text: nativeText,
          url: profileUrl,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(nativeText + "\n\n" + profileUrl);
      toast.success("Schedule copied — paste it anywhere 📋");
    } catch {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-['Space_Grotesk'] text-base font-bold">Share your show</DialogTitle>
        </DialogHeader>

        {/* Preview Card */}
        <div className="rounded-[10px] border border-primary bg-[#0A0A0A] p-5 space-y-3">
          <p className="text-center text-white font-bold text-sm tracking-wide">UPLY</p>
          <p className="text-center text-muted-foreground text-sm">
            {creator.display_name} is going live.
          </p>
          <p className="text-center font-['Space_Grotesk'] text-lg font-extrabold text-primary">
            {stream.title}
          </p>
          <p className="text-center text-muted-foreground text-[13px]">
            {dateStr} · {timeStr}
          </p>
          <p className="text-center text-primary text-[13px]">
            Watch live → uply.tv/{creator.username}
          </p>
        </div>

        <Button
          onClick={handleShare}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          <Share2 className="w-4 h-4" /> Share Schedule
        </Button>
      </DialogContent>
    </Dialog>
  );
}
