import { useState } from 'react';

export interface StreamOverlayTheme {
  id: string;
  name: string;
  description: string;
  preview: string; // emoji/icon
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  borderRadius: string;
  fontStyle: string;
  alertAnimation: 'bounce' | 'slide' | 'fade' | 'explode' | 'glow';
  chatBubbleStyle: 'minimal' | 'rounded' | 'pill' | 'angular';
  category: 'gaming' | 'professional' | 'creative' | 'chill' | 'party';
}

const OVERLAY_THEMES: StreamOverlayTheme[] = [
  {
    id: 'neon-gaming',
    name: 'Neon Gaming',
    description: 'Cyberpunk-inspired neon glow effects',
    preview: '🎮',
    colors: { primary: '#00ff88', secondary: '#ff00ff', accent: '#00ccff', text: '#ffffff', background: 'rgba(0,0,0,0.8)' },
    borderRadius: '4px',
    fontStyle: 'font-mono',
    alertAnimation: 'explode',
    chatBubbleStyle: 'angular',
    category: 'gaming',
  },
  {
    id: 'clean-pro',
    name: 'Clean Pro',
    description: 'Minimal, professional stream look',
    preview: '💼',
    colors: { primary: '#3b82f6', secondary: '#64748b', accent: '#f59e0b', text: '#f8fafc', background: 'rgba(15,23,42,0.9)' },
    borderRadius: '12px',
    fontStyle: 'font-sans',
    alertAnimation: 'fade',
    chatBubbleStyle: 'rounded',
    category: 'professional',
  },
  {
    id: 'sunset-creative',
    name: 'Sunset Creative',
    description: 'Warm gradients for artistic streams',
    preview: '🎨',
    colors: { primary: '#f97316', secondary: '#ec4899', accent: '#fbbf24', text: '#ffffff', background: 'rgba(30,10,40,0.85)' },
    borderRadius: '16px',
    fontStyle: 'font-serif',
    alertAnimation: 'glow',
    chatBubbleStyle: 'pill',
    category: 'creative',
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Chill',
    description: 'Relaxed vibes with soft pastel tones',
    preview: '☕',
    colors: { primary: '#a78bfa', secondary: '#67e8f9', accent: '#fda4af', text: '#e2e8f0', background: 'rgba(30,27,75,0.8)' },
    borderRadius: '20px',
    fontStyle: 'font-sans',
    alertAnimation: 'slide',
    chatBubbleStyle: 'pill',
    category: 'chill',
  },
  {
    id: 'party-mode',
    name: 'Party Mode',
    description: 'High energy with rainbow effects',
    preview: '🎉',
    colors: { primary: '#ef4444', secondary: '#8b5cf6', accent: '#22c55e', text: '#ffffff', background: 'rgba(0,0,0,0.75)' },
    borderRadius: '8px',
    fontStyle: 'font-bold',
    alertAnimation: 'bounce',
    chatBubbleStyle: 'rounded',
    category: 'party',
  },
  {
    id: 'retro-pixel',
    name: 'Retro Pixel',
    description: '8-bit style pixel art theme',
    preview: '👾',
    colors: { primary: '#00ff00', secondary: '#ff6600', accent: '#ffff00', text: '#00ff00', background: 'rgba(0,0,20,0.9)' },
    borderRadius: '0px',
    fontStyle: 'font-mono',
    alertAnimation: 'bounce',
    chatBubbleStyle: 'angular',
    category: 'gaming',
  },
];

export function useStreamOverlayThemes() {
  const [activeTheme, setActiveTheme] = useState<StreamOverlayTheme>(OVERLAY_THEMES[1]); // default: Clean Pro
  const [customTheme, setCustomTheme] = useState<Partial<StreamOverlayTheme>>({});

  const selectTheme = (themeId: string) => {
    const theme = OVERLAY_THEMES.find(t => t.id === themeId);
    if (theme) setActiveTheme(theme);
  };

  const getThemeCSS = (): Record<string, string> => ({
    '--stream-primary': activeTheme.colors.primary,
    '--stream-secondary': activeTheme.colors.secondary,
    '--stream-accent': activeTheme.colors.accent,
    '--stream-text': activeTheme.colors.text,
    '--stream-bg': activeTheme.colors.background,
    '--stream-radius': activeTheme.borderRadius,
  });

  return {
    themes: OVERLAY_THEMES,
    activeTheme,
    selectTheme,
    getThemeCSS,
    customTheme,
    setCustomTheme,
  };
}
