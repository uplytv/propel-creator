import { ReactNode, MouseEventHandler } from "react";

interface PressableCardProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  /** Show subtle green dot top-right (unread / new) */
  unread?: boolean;
  ariaLabel?: string;
}

/**
 * Standard tap/press feedback for all home cards.
 * Scales to 0.97 with 150ms ease on active — signals interactivity (Upgrade 7).
 */
export default function PressableCard({
  children,
  onClick,
  className = "",
  unread,
  ariaLabel,
}: PressableCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).click();
        }
      }}
      className={`relative snap-start transition-transform duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85] rounded-lg ${className}`}
    >
      {children}
      {unread && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-[#00FF85] shadow-[0_0_6px_rgba(0,255,133,0.8)]"
        />
      )}
    </div>
  );
}
