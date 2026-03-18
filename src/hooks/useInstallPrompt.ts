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

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 3rd session
      if (sessions >= 3) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
