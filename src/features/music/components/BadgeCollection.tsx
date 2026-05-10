import { Award, Crown, Flame, Heart, Play, Star, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBadgeCatalog, useMyBadges } from '../hooks/useMusicGamification';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  play: Play,
  flame: Flame,
  crown: Crown,
  heart: Heart,
  star: Star,
};

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-700/30 to-amber-900/30 border-amber-700/40',
  silver: 'from-zinc-300/20 to-zinc-500/20 border-zinc-400/40',
  gold: 'from-yellow-400/20 to-yellow-600/20 border-yellow-500/40',
  platinum: 'from-primary/20 to-blue-400/20 border-primary/40',
};

export function BadgeCollection() {
  const { data: catalog = [] } = useBadgeCatalog();
  const { data: mine = [] } = useMyBadges();
  const unlocked = new Set(mine.map((b: any) => b.badge_key));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">
          Badges <span className="text-muted-foreground text-sm font-normal">({unlocked.size}/{catalog.length})</span>
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {catalog.map((b) => {
          const Icon = ICONS[b.icon ?? ''] ?? Award;
          const isUnlocked = unlocked.has(b.key);
          return (
            <Card
              key={b.key}
              className={`p-3 text-center bg-gradient-to-br ${TIER_COLORS[b.tier] ?? TIER_COLORS.bronze} ${
                !isUnlocked ? 'opacity-40' : ''
              }`}
            >
              <div className="flex justify-center mb-2 relative">
                <Icon className="w-8 h-8" />
                {!isUnlocked && (
                  <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-muted-foreground" />
                )}
              </div>
              <p className="font-semibold text-sm">{b.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
              <Badge variant="outline" className="text-[9px] mt-2 capitalize">{b.tier}</Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
