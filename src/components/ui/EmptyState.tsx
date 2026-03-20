import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  iconColor?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  iconColor = "text-muted-foreground",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center text-center py-8 px-6"
    >
      <Icon className={`w-8 h-8 ${iconColor} mb-4`} />
      <h3 className="text-base font-semibold text-foreground mb-1 max-w-[280px] leading-tight">
        {title}
      </h3>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed mb-4 line-clamp-2">
        {description}
      </p>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button variant="outline" onClick={onAction} size="sm" className="border-primary text-primary hover:bg-primary/10">
            {actionLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button variant="ghost" onClick={onSecondary} size="sm">
            {secondaryLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
