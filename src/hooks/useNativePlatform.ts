import { useEffect, useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// ── Haptics ──────────────────────────────────────────────
let HapticsModule: typeof import('@capacitor/haptics') | null = null;

async function loadHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!HapticsModule) {
    HapticsModule = await import('@capacitor/haptics');
  }
  return HapticsModule;
}

export type HapticWeight = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

export function useHaptics() {
  const trigger = useCallback(async (weight: HapticWeight = 'light') => {
    const mod = await loadHaptics();
    if (!mod) return;

    const { Haptics, ImpactStyle, NotificationType } = mod;

    switch (weight) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  }, []);

  return trigger;
}

// ── Status Bar ───────────────────────────────────────────
export function useStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const statusBarPkg = '@capacitor/status-bar';
        const mod = await import(/* @vite-ignore */ statusBarPkg);
        const { StatusBar, Style } = mod;
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#0A0A0A' });
        }
      } catch {
        // @capacitor/status-bar not available in web builds
      }
    })();
  }, []);
}

// ── Keyboard ─────────────────────────────────────────────
export function useKeyboardState() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { Keyboard } = await import('@capacitor/keyboard');
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
      await Keyboard.setScroll({ isDisabled: false });

      const showHandle = await Keyboard.addListener('keyboardWillShow', () => {
        setIsKeyboardOpen(true);
        document.body.classList.add('keyboard-open');
      });
      const hideHandle = await Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardOpen(false);
        document.body.classList.remove('keyboard-open');
      });

      cleanup = () => {
        showHandle.remove();
        hideHandle.remove();
      };
    })();

    return () => cleanup?.();
  }, []);

  return isKeyboardOpen;
}

// ── Splash Screen ────────────────────────────────────────
export function useSplashScreen() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide({ fadeOutDuration: 400 });
    })();
  }, []);
}

// ── Android Back Button ──────────────────────────────────
export function useAndroidBackButton(onBack?: () => boolean) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    let cleanup: (() => void) | undefined;
    let lastBackPress = 0;

    (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        // Let caller handle (e.g., close modal)
        if (onBackRef.current?.()) return;

        if (canGoBack) {
          window.history.back();
        } else {
          const now = Date.now();
          if (now - lastBackPress < 2000) {
            App.exitApp();
          } else {
            lastBackPress = now;
            // Show toast via DOM to avoid importing sonner here
            const el = document.createElement('div');
            el.textContent = 'Press back again to exit';
            el.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-card text-foreground text-sm z-[9999] shadow-lg border border-border';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 2000);
          }
        }
      });

      cleanup = () => handle.remove();
    })();

    return () => cleanup?.();
  }, []);
}

// ── Combined initializer ─────────────────────────────────
export function useNativeInit() {
  useStatusBar();
  useSplashScreen();
  useAndroidBackButton();
}

// ── Platform detection ───────────────────────────────────
export const isNative = () => Capacitor.isNativePlatform();
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';
