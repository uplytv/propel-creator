import { Sparkles, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  hasSpatial?: boolean;
  hasLossless?: boolean;
  activeTier?: 'spatial' | 'lossless' | 'standard';
  className?: string;
  size?: 'sm' | 'md';
}

export function AudioQualityBadges({ hasSpatial, hasLossless, activeTier, className, size = 'sm' }: Props) {
  if (!hasSpatial && !hasLossless) return null;
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[11px]';
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {hasSpatial && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider',
            px,
            activeTier === 'spatial' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
          )}
        >
          <Sparkles className="h-2.5 w-2.5" /> Atmos
        </span>
      )}
      {hasLossless && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider border',
            px,
            activeTier === 'lossless'
              ? 'border-primary bg-primary/20 text-primary'
              : 'border-border text-muted-foreground',
          )}
        >
          <Waves className="h-2.5 w-2.5" /> Hi-Res
        </span>
      )}
    </div>
  );
}
