import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useVoiceAria — browser-native voice mode for ARIA.
 *
 * STT: webkitSpeechRecognition / SpeechRecognition (Chrome, Edge, Safari).
 * TTS: window.speechSynthesis. Zero external services or keys.
 * On unsupported browsers (e.g. Firefox) `supported` is false — hide the UI.
 */

const VOICE_REPLIES_KEY = "aria_voice_replies";

// --- Minimal typings (SpeechRecognition is not in TS's DOM lib) ---
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function ttsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Strip markdown + emoji so speechSynthesis reads clean prose. */
export function toSpeakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (code omitted) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*\*|___)([\s\S]*?)\1/g, "$2")
    .replace(/(\*\*|__)([\s\S]*?)\1/g, "$2")
    .replace(/(\*|_)([^*_\n]+)\1/g, "$2")
    .replace(/~~([\s\S]*?)~~/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "")
    .replace(/\|/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split long text into sentence-ish chunks — avoids Chrome's long-utterance cutoff. */
function chunkForSpeech(text: string, maxLen = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current && current.length + s.length > maxLen) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

const PREFERRED_VOICES = [
  "Microsoft Aria", // fitting, and one of the most natural on Edge/Windows
  "Google US English",
  "Microsoft Jenny",
  "Samantha",
  "Alex",
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name.startsWith(name));
    if (match) return match;
  }
  return (
    voices.find((v) => v.lang === "en-US" && v.default) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

export interface UseVoiceAriaOptions {
  /** Live interim transcript while the user is speaking (show it in the input). */
  onInterim?: (transcript: string) => void;
  /** Final transcript when the user stops speaking — send it through the existing send path. */
  onFinal?: (transcript: string) => void;
}

export interface UseVoiceAria {
  /** SpeechRecognition available in this browser (false on Firefox etc.). */
  supported: boolean;
  listening: boolean;
  speaking: boolean;
  /** Friendly error message (mic permission denied, no speech, ...) or null. */
  error: string | null;
  /** Speak-replies-aloud toggle, persisted in localStorage "aria_voice_replies". */
  voiceReplies: boolean;
  toggleVoiceReplies: () => void;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  /** Speak text aloud unconditionally (cancels anything already speaking). */
  speak: (text: string) => void;
  /** Speak only if the voice-replies toggle is on. */
  speakReply: (text: string) => void;
  stopSpeaking: () => void;
}

export function useVoiceAria(options: UseVoiceAriaOptions = {}): UseVoiceAria {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceReplies, setVoiceReplies] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VOICE_REPLIES_KEY) !== "off";
    } catch {
      return true;
    }
  });

  const voiceRepliesRef = useRef(voiceReplies);
  voiceRepliesRef.current = voiceReplies;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speakGenRef = useRef(0); // invalidates onend handlers of cancelled utterances

  // speechSynthesis.getVoices() is often empty until "voiceschanged" fires.
  useEffect(() => {
    if (!ttsAvailable()) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (!ttsAvailable()) return;
    speakGenRef.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsAvailable()) return;
      const clean = toSpeakable(text);
      if (!clean) return;
      stopSpeaking(); // cancel-before-speak
      const gen = ++speakGenRef.current;
      const synth = window.speechSynthesis;
      const voice = pickVoice(voicesRef.current);
      const chunks = chunkForSpeech(clean);
      let remaining = chunks.length;
      setSpeaking(true);
      for (const chunk of chunks) {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        const done = () => {
          if (speakGenRef.current !== gen) return; // superseded/cancelled
          remaining -= 1;
          if (remaining <= 0) setSpeaking(false);
        };
        utterance.onend = done;
        utterance.onerror = done;
        synth.speak(utterance);
      }
    },
    [stopSpeaking]
  );

  const speakReply = useCallback(
    (text: string) => {
      if (voiceRepliesRef.current) speak(text);
    },
    [speak]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop(); // onend fires and delivers any final transcript
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || listeningRef.current) return;
    stopSpeaking(); // don't talk over the user
    setError(null);
    finalTranscriptRef.current = "";

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) finalTranscriptRef.current = finalText;
      optionsRef.current.onInterim?.((finalText + interimText).trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access is blocked. Allow the mic in your browser's site settings to talk to ARIA.");
      } else if (event.error === "no-speech") {
        setError("Didn't catch that — tap the mic and try again.");
      } else if (event.error === "audio-capture") {
        setError("No microphone found on this device.");
      } else if (event.error !== "aborted") {
        setError("Voice input hit a snag. Please try again.");
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      const finalText = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (finalText) optionsRef.current.onFinal?.(finalText);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setError("Couldn't start the microphone. Please try again.");
    }
  }, [stopSpeaking]);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) stopListening();
    else startListening();
  }, [startListening, stopListening]);

  const toggleVoiceReplies = useCallback(() => {
    setVoiceReplies((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VOICE_REPLIES_KEY, next ? "on" : "off");
      } catch {
        /* private mode etc. — non-fatal */
      }
      if (!next) stopSpeaking();
      return next;
    });
  }, [stopSpeaking]);

  // Cleanup on unmount: kill mic + speech.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* already stopped */
      }
      if (ttsAvailable()) {
        speakGenRef.current += 1;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    supported,
    listening,
    speaking,
    error,
    voiceReplies,
    toggleVoiceReplies,
    startListening,
    stopListening,
    toggleListening,
    speak,
    speakReply,
    stopSpeaking,
  };
}
