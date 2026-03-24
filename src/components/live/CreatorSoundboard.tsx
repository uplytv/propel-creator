import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { SoundEffect } from "@/hooks/useCreatorSoundboard";

interface CreatorSoundboardProps {
  sounds: SoundEffect[];
  playing: string | null;
  onPlay: (sound: SoundEffect) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}

export default function CreatorSoundboard({
  sounds,
  playing,
  onPlay,
  volume,
  onVolumeChange,
}: CreatorSoundboardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-card p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-sm">🎛️</span>
        <span className="text-xs font-bold text-foreground flex-1">Soundboard</span>
        {volume > 0 ? (
          <Volume2 className="w-3 h-3 text-muted-foreground" />
        ) : (
          <VolumeX className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-3 space-y-3"
        >
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <VolumeX className="w-3 h-3 text-muted-foreground" />
            <Slider
              value={[volume * 100]}
              onValueChange={([v]) => onVolumeChange(v / 100)}
              max={100}
              step={5}
              className="flex-1"
            />
            <Volume2 className="w-3 h-3 text-muted-foreground" />
          </div>

          {/* Sound grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {sounds.map(sound => (
              <motion.button
                key={sound.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => onPlay(sound)}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors ${
                  playing === sound.id
                    ? 'bg-primary/20 ring-1 ring-primary'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <span className="text-lg">{sound.emoji}</span>
                <span className="text-[8px] text-muted-foreground leading-tight text-center">
                  {sound.name}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
