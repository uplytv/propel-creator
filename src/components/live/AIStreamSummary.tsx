import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { HighlightMoment } from "@/hooks/useStreamHighlights";

interface AIStreamSummaryProps {
  streamId: string;
  streamTitle: string;
  durationSeconds: number;
  highlights: HighlightMoment[];
  chaptersDescription?: string;
  creatorId: string;
}

export default function AIStreamSummary({
  streamId,
  streamTitle,
  durationSeconds,
  highlights,
  chaptersDescription,
  creatorId,
}: AIStreamSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const highlightsSummary = highlights
        .map((h) => `[${Math.floor(h.timestamp / 60)}:${(h.timestamp % 60).toString().padStart(2, "0")}] ${h.label} (score: ${h.score})`)
        .join("\n");

      const { data, error: fnError } = await supabase.functions.invoke("aria-chat", {
        body: {
          message: `Generate a concise, engaging summary of this live stream for social sharing and SEO.

Stream Title: ${streamTitle}
Duration: ${Math.floor(durationSeconds / 60)} minutes

${highlightsSummary ? `Key Moments:\n${highlightsSummary}` : ""}
${chaptersDescription ? `\nChapters:\n${chaptersDescription}` : ""}

Write:
1. A 2-3 sentence summary
2. 3-5 key takeaways as bullet points
3. A suggested social media caption (< 280 chars)

Format using markdown.`,
        },
      });

      if (fnError) throw fnError;
      setSummary(data?.reply || data?.response || "Summary generation completed.");
    } catch (err: any) {
      setError(err.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!summary && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">AI Stream Summary</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Generate an AI-powered summary of your stream with key takeaways and a shareable caption.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={generateSummary}
          className="w-full"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Generate Summary
        </Button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card p-6 text-center">
        <Loader2 className="w-6 h-6 text-primary mx-auto mb-2 animate-spin" />
        <p className="text-xs text-muted-foreground">Analyzing your stream...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-4">
        <p className="text-xs text-destructive mb-2">Failed to generate summary</p>
        <Button variant="outline" size="sm" onClick={generateSummary}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">AI Summary</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="prose prose-sm max-w-none text-xs text-muted-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-foreground [&_li]:text-xs [&_p]:text-xs [&_ul]:my-1 [&_ol]:my-1">
            <div style={{ whiteSpace: "pre-wrap" }}>{summary}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={generateSummary} className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
