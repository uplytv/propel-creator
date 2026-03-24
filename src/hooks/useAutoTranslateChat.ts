import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TranslatedMessage {
  originalId: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export function useAutoTranslateChat(streamId: string) {
  const [enabled, setEnabled] = useState(false);
  const [targetLang, setTargetLang] = useState<LanguageCode>('en');
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [translating, setTranslating] = useState(false);
  const batchRef = useRef<Array<{ id: string; text: string }>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const translateBatch = useCallback(async (messages: Array<{ id: string; text: string }>) => {
    if (!messages.length || !enabled) return;
    setTranslating(true);

    try {
      const textsToTranslate = messages.map(m => m.text).join('\n---MSG_SEP---\n');

      const { data, error } = await supabase.functions.invoke('aria-chat', {
        body: {
          message: `Translate each message to ${targetLang}. Keep the same order. Separate with ---MSG_SEP---. Only output translations, nothing else.\n\n${textsToTranslate}`,
          context: 'chat_translation',
        },
      });

      if (error || !data?.reply) return;

      const translated = (data.reply as string).split('---MSG_SEP---').map((t: string) => t.trim());

      setTranslations(prev => {
        const next = new Map(prev);
        messages.forEach((msg, i) => {
          if (translated[i] && translated[i] !== msg.text) {
            next.set(msg.id, translated[i]);
          }
        });
        return next;
      });
    } catch {
      // Silently fail translation
    } finally {
      setTranslating(false);
    }
  }, [enabled, targetLang]);

  const queueTranslation = useCallback((messageId: string, text: string) => {
    if (!enabled || text.length < 3) return;

    batchRef.current.push({ id: messageId, text });

    // Debounce: translate in batches every 2s
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const batch = [...batchRef.current];
      batchRef.current = [];
      translateBatch(batch);
    }, 2000);
  }, [enabled, translateBatch]);

  const getTranslation = useCallback((messageId: string): string | null => {
    return translations.get(messageId) || null;
  }, [translations]);

  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
    if (enabled) {
      setTranslations(new Map());
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    enabled,
    toggle,
    targetLang,
    setTargetLang,
    queueTranslation,
    getTranslation,
    translating,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
