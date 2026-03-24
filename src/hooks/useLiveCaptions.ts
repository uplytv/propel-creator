import { useState, useRef, useCallback } from 'react';

export interface Caption {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

/**
 * Real-time speech-to-text captions using the Web Speech API.
 * Provides live transcription overlay for viewers.
 */
export function useLiveCaptions() {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const captionIdRef = useRef(0);

  const start = useCallback((lang: string = 'en-US') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Captions] SpeechRecognition not supported');
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          captionIdRef.current += 1;
          const newCaption: Caption = {
            id: `cap-${captionIdRef.current}`,
            text: transcript.trim(),
            isFinal: true,
            timestamp: Date.now(),
          };
          setCaptions(prev => [...prev.slice(-20), newCaption]);
          setInterimText('');
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.warn('[Captions] error:', event.error);
      if (event.error === 'not-allowed') {
        setIsActive(false);
        return;
      }
      // Auto-restart on recoverable errors
      if (event.error !== 'aborted') {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsActive(true);
    return true;
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch {}
    }
    setIsActive(false);
    setInterimText('');
  }, []);

  const toggle = useCallback((lang?: string) => {
    if (isActive) { stop(); } else { start(lang); }
  }, [isActive, start, stop]);

  // Get recent captions for display (last 3 + interim)
  const displayCaptions = captions.slice(-3);

  return {
    isActive,
    captions: displayCaptions,
    interimText,
    start,
    stop,
    toggle,
    allCaptions: captions,
  };
}
