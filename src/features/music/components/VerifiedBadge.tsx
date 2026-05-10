import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  title?: string;
}

export function VerifiedBadge({ size = 16, className, title = 'Verified Artist' }: VerifiedBadgeProps) {
  return (
    <span className={cn('inline-flex items-center text-primary', className)} title={title} aria-label={title}>
      <BadgeCheck size={size} className="fill-primary/20 stroke-primary" />
    </span>
  );
}
