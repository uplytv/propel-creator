import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { StreamOverlayTheme } from "@/hooks/useStreamOverlayThemes";

interface OverlayThemePickerProps {
  themes: StreamOverlayTheme[];
  activeTheme: StreamOverlayTheme;
  onSelect: (themeId: string) => void;
  onClose: () => void;
}

export default function OverlayThemePicker({ themes, activeTheme, onSelect, onClose }: OverlayThemePickerProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const categories = Array.from(new Set(themes.map(t => t.category)));
  const filtered = filter ? themes.filter(t => t.category === filter) : themes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">🎨 Stream Themes</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto">
        <button
          onClick={() => setFilter(null)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
            !filter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize whitespace-nowrap transition-colors ${
              filter === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map(theme => {
          const isActive = theme.id === activeTheme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`relative text-left p-3 rounded-xl border transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {isActive && (
                <div className="absolute top-2 right-2">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              {/* Color preview */}
              <div className="flex gap-1 mb-2">
                {Object.values(theme.colors).slice(0, 4).map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold text-foreground">
                {theme.preview} {theme.name}
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{theme.description}</p>

              {/* Style preview */}
              <div
                className="mt-2 px-2 py-1 text-[8px] text-center"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderRadius: theme.borderRadius,
                }}
              >
                Chat preview
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
