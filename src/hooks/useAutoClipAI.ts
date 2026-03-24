import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { HighlightMoment } from '@/hooks/useStreamHighlights';

export interface AIClipSuggestion {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  reason: string;
  score: number;
  status: 'suggested' | 'creating' | 'done' | 'skipped';
}

export function useAutoClipAI(streamId: string, creatorId: string) {
  const [suggestions, setSuggestions] = useState<AIClipSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeStream = useCallback(async (
    highlights: HighlightMoment[],
    chaptersDescription?: string,
    durationSeconds?: number,
  ) => {
    if (analyzing || !highlights.length) return;
    setAnalyzing(true);

    try {
      const prompt = `Analyze this live stream data and identify the best 3-5 clip-worthy moments.

Stream duration: ${durationSeconds || 0} seconds.

Highlights/engagement peaks:
${highlights.map(h => `- ${Math.floor(h.timestamp / 60)}:${(h.timestamp % 60).toString().padStart(2, '0')} | Score: ${h.score} | ${h.type} | ${h.label}`).join('\n')}

${chaptersDescription ? `VOD Chapters:\n${chaptersDescription}` : ''}

For each clip, suggest a start time, end time (15-60s clips), catchy title, and reason why it would perform well on social media.`;

      const { data, error } = await supabase.functions.invoke('aria-chat', {
        body: {
          message: prompt,
          context: 'clip_analysis',
          creator_id: creatorId,
        },
      });

      if (error) throw error;

      // Parse AI response into clip suggestions
      const clipSuggestions: AIClipSuggestion[] = [];
      const sortedHighlights = [...highlights].sort((a, b) => b.score - a.score);

      // Use engagement data to create clips around peak moments
      sortedHighlights.slice(0, 5).forEach((h, i) => {
        const clipDuration = h.score > 50 ? 45 : 30;
        const startTime = Math.max(0, h.timestamp - 10);
        const endTime = Math.min(durationSeconds || startTime + clipDuration, startTime + clipDuration);

        clipSuggestions.push({
          id: `clip-${i}`,
          startTime,
          endTime,
          title: h.label || `Peak Moment #${i + 1}`,
          reason: `${h.type} moment with engagement score of ${h.score}`,
          score: h.score,
          status: 'suggested',
        });
      });

      setSuggestions(clipSuggestions);
      toast({ title: `🤖 Found ${clipSuggestions.length} clip-worthy moments!` });
    } catch (err: any) {
      toast({ title: 'AI analysis failed', description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, streamId, creatorId, toast]);

  const createClip = useCallback(async (suggestion: AIClipSuggestion, muxAssetId: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === suggestion.id ? { ...s, status: 'creating' as const } : s)
    );

    try {
      const { error } = await supabase.functions.invoke('create-clip', {
        body: {
          asset_id: muxAssetId,
          start_time: suggestion.startTime,
          end_time: suggestion.endTime,
          caption: suggestion.title,
          creator_id: creatorId,
        },
      });

      if (error) throw error;

      setSuggestions(prev =>
        prev.map(s => s.id === suggestion.id ? { ...s, status: 'done' as const } : s)
      );
      toast({ title: `✂️ Clip "${suggestion.title}" created!` });
    } catch (err: any) {
      setSuggestions(prev =>
        prev.map(s => s.id === suggestion.id ? { ...s, status: 'suggested' as const } : s)
      );
      toast({ title: 'Clip creation failed', description: err.message, variant: 'destructive' });
    }
  }, [creatorId, toast]);

  const skipClip = useCallback((id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'skipped' as const } : s)
    );
  }, []);

  return { suggestions, analyzing, analyzeStream, createClip, skipClip };
}
