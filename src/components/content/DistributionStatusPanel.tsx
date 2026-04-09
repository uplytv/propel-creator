import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ExternalLink, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PLAT: Record<string, { name: string; color: string; logo: string }> = {
  youtube:   { name: "YouTube",   color: "#FF0000", logo: "▶" },
  tiktok:    { name: "TikTok",    color: "#010101", logo: "♪" },
  instagram: { name: "Instagram", color: "#E1306C", logo: "◻" },
  twitter:   { name: "X",         color: "#1DA1F2", logo: "𝕏" },
  linkedin:  { name: "LinkedIn",  color: "#0A66C2", logo: "in" },
  facebook:  { name: "Facebook",  color: "#1877F2", logo: "f" },
};

interface Job {
  id: string;
  platform: string;
  status: string;
  platform_url?: string;
}

export default function DistributionStatusPanel({ contentId }: { contentId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!contentId) return;
    supabase
      .from("content_distribution_jobs" as any)
      .select("*")
      .eq("content_id", contentId)
      .then(({ data }) => setJobs((data as any) || []));

    const ch = supabase
      .channel(`dist-${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_distribution_jobs",
          filter: `content_id=eq.${contentId}`,
        },
        (p: any) =>
          setJobs((prev) => {
            const exists = prev.find((j) => j.id === p.new.id);
            return exists
              ? prev.map((j) => (j.id === p.new.id ? p.new : j))
              : [...prev, p.new];
          })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [contentId]);

  if (!jobs.length) return null;

  const publishedCount = jobs.filter((j) => j.status === "published").length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Distributing to {jobs.length} platform{jobs.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {publishedCount}/{jobs.length} live
        </span>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const p = PLAT[job.platform];
          if (!p) return null;
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: p.color }}
              >
                {p.logo}
              </div>
              <span className="text-sm text-foreground flex-1">{p.name}</span>

              {job.status === "queued" && (
                <span className="text-xs text-muted-foreground">Queued</span>
              )}
              {job.status === "processing" && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Posting…
                </div>
              )}
              {job.status === "published" && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Live
                  {job.platform_url && (
                    <a
                      href={job.platform_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
              {job.status === "failed" && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="w-3 h-3" />
                  Failed
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
