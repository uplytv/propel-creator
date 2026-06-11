import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Image as ImageIcon, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";

interface BlastHistoryProps {
  creatorId: string;
}

export default function BlastHistory({ creatorId }: BlastHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: blasts = [], isLoading } = useQuery({
    queryKey: ["blast-history", creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_blasts")
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (blasts.length === 0) {
    return (
      <div className="p-8 text-center">
        <span className="text-3xl block mb-2">📣</span>
        <p className="text-sm font-medium text-foreground">No blasts sent yet</p>
        <p className="text-xs text-muted-foreground mt-1">Your blast history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {blasts.map((blast: any) => (
        <div key={blast.id} className="rounded-lg border border-border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === blast.id ? null : blast.id)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{blast.subject}</p>
              <p className="text-[11px] text-muted-foreground">
                {blast.sent_at
                  ? formatDistanceToNow(new Date(blast.sent_at), { addSuffix: true })
                  : "Pending"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {blast.media_type === "image" && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <ImageIcon className="w-3 h-3" /> 📷
                </Badge>
              )}
              {blast.media_type === "video" && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Video className="w-3 h-3" /> 🎥
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{blast.recipient_count} sent</span>
              <Badge
                variant={blast.status === "sent" ? "default" : "secondary"}
                className="text-[10px] capitalize"
              >
                {blast.status}
              </Badge>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  expandedId === blast.id ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          <AnimatePresence>
            {expandedId === blast.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{blast.message}</p>

                  {blast.media_type === "image" && blast.media_url && (
                    <img src={blast.media_url} alt={blast.subject} loading="lazy" className="w-full max-h-[300px] object-cover rounded-lg" />
                  )}
                  {blast.media_type === "video" && blast.mux_playback_id && (
                    <UPLYMuxPlayer playbackId={blast.mux_playback_id} autoPlay={false} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
