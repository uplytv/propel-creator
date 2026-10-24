import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'uply_install_dismissed';
const SESSION_KEY = 'uply_session_count';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    // Don't show in native app or if already installed
    if (Capacitor.isNativePlatform()) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Track sessions
    const sessions = Number(sessionStorage.getItem(SESSION_KEY) || '0') + 1;
    sessionStorage.setItem(SESSION_KEY, String(sessions));

    // Check dismissal count
    const dismissed = Number(localStorage.getItem(STORAGE_KEY) || '0');
    if (dismissed >= 2) return;
    if (sessions < 3) return;
    setEligible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Keep the install card off the first viewport. Show it only after the
  // visitor scrolls past the hero (or an equivalent fold on other pages).
  useEffect(() => {
    if (!eligible || !deferredPrompt) return;
    const reveal = () => {
      if (window.scrollY > window.innerHeight * 0.85) setShowPrompt(true);
    };
    reveal();
    window.addEventListener('scroll', reveal, { passive: true });
    return () => window.removeEventListener('scroll', reveal);
  }, [eligible, deferredPrompt]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    const count = Number(localStorage.getItem(STORAGE_KEY) || '0') + 1;
    localStorage.setItem(STORAGE_KEY, String(count));
    setShowPrompt(false);
  }, []);

  return { showPrompt, install, dismiss };
}
