import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  hype: number;
  dominant: "positive" | "neutral" | "negative" | "hype";
  emoji: string;
  history: { timestamp: number; positive: number; negative: number; hype: number }[];
}

const POSITIVE_WORDS = new Set(["love", "amazing", "great", "awesome", "nice", "good", "best", "fire", "goat", "w", "lets go", "hype", "poggers", "pog", "based", "incredible", "beautiful", "perfect", "yes", "wow", "epic"]);
const NEGATIVE_WORDS = new Set(["bad", "boring", "trash", "terrible", "worst", "hate", "cringe", "l", "mid", "meh", "awful", "lame", "sucks", "no"]);
const HYPE_WORDS = new Set(["!!!!", "hype", "lets go", "poggers", "pog", "omg", "insane", "clutch", "goated", "sheesh", "bruh"]);
const HYPE_EMOJIS = ["🔥", "🎉", "💯", "⚡", "🚀", "😱", "🤯"];

function analyzeSentiment(message: string): "positive" | "neutral" | "negative" | "hype" {
  const lower = message.toLowerCase();
  const words = lower.split(/\s+/);

  let posScore = 0;
  let negScore = 0;
  let hypeScore = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) posScore++;
    if (NEGATIVE_WORDS.has(word)) negScore++;
    if (HYPE_WORDS.has(word)) hypeScore++;
  }

  // Check for hype emojis
  for (const emoji of HYPE_EMOJIS) {
    if (message.includes(emoji)) hypeScore++;
  }

  // Exclamation marks boost hype
  const exclamations = (message.match(/!/g) || []).length;
  if (exclamations >= 3) hypeScore++;

  // ALL CAPS boost hype
  if (message === message.toUpperCase() && message.length > 3) hypeScore++;

  if (hypeScore >= 2) return "hype";
  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

export function useViewerSentiment(streamId: string | undefined) {
  const [sentiment, setSentiment] = useState<SentimentData>({
    positive: 0,
    neutral: 100,
    negative: 0,
    hype: 0,
    dominant: "neutral",
    emoji: "😐",
    history: [],
  });

  const countsRef = useRef({ positive: 0, neutral: 0, negative: 0, hype: 0, total: 0 });
  const windowRef = useRef<{ sentiment: string; time: number }[]>([]);

  const processMessage = useCallback((message: string) => {
    const result = analyzeSentiment(message);
    const now = Date.now();

    windowRef.current.push({ sentiment: result, time: now });
    // Keep last 60 seconds
    windowRef.current = windowRef.current.filter((m) => now - m.time < 60000);

    const window = windowRef.current;
    const total = window.length || 1;
    const pos = window.filter((m) => m.sentiment === "positive").length;
    const neg = window.filter((m) => m.sentiment === "negative").length;
    const hyp = window.filter((m) => m.sentiment === "hype").length;
    const neu = total - pos - neg - hyp;

    const posPercent = Math.round((pos / total) * 100);
    const negPercent = Math.round((neg / total) * 100);
    const hypPercent = Math.round((hyp / total) * 100);
    const neuPercent = 100 - posPercent - negPercent - hypPercent;

    let dominant: SentimentData["dominant"] = "neutral";
    let emoji = "😐";
    const max = Math.max(posPercent, negPercent, hypPercent, neuPercent);
    if (max === hypPercent && hypPercent > 20) { dominant = "hype"; emoji = "🔥"; }
    else if (max === posPercent) { dominant = "positive"; emoji = "😊"; }
    else if (max === negPercent) { dominant = "negative"; emoji = "😟"; }

    setSentiment((prev) => ({
      positive: posPercent,
      neutral: neuPercent,
      negative: negPercent,
      hype: hypPercent,
      dominant,
      emoji,
      history: [
        ...prev.history.slice(-29),
        { timestamp: now, positive: posPercent, negative: negPercent, hype: hypPercent },
      ],
    }));
  }, []);

  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`sentiment-${streamId}`)
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (payload?.message) processMessage(payload.message);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId, processMessage]);

  return sentiment;
}
