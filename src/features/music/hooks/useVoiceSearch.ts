import { useEffect, useRef, useState, useCallback } from 'react';

type ISpeechRecognition = any;

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export function useVoiceSearch(opts: { onResult?: (text: string) => void; lang?: string } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    setError(null);
    setTranscript('');
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setError('Voice search is not supported on this device.');
      return;
    }
    const rec = new Ctor();
    rec.lang = opts.lang ?? navigator.language ?? 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) {
        opts.onResult?.(text.trim());
      }
    };
    rec.onerror = (e: any) => setError(e?.error || 'voice error');
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); } catch { /* already started */ }
  }, [opts]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
