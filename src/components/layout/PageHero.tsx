import type { ReactNode } from "react";

/**
 * Premium interior page hero — brings the landing's design language (ambient
 * purple + gold glow, gold eyebrow, brand blue→purple gradient headline) into
 * app pages so the interior feels consistent with the marketing site.
 */
export default function PageHero({
  eyebrow,
  title,
  gradientWord,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  gradientWord?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -top-24 -translate-x-1/2 w-[70vw] h-[70vw] max-w-[640px] max-h-[640px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-[8%] top-[10%] w-[30vw] h-[30vw] max-w-[300px] max-h-[300px] rounded-full bg-[hsl(var(--gold)/0.08)] blur-[110px]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 py-7 sm:py-9 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow-gold mb-2">{eyebrow}</p>}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {title}
            {gradientWord && (
              <>
                {" "}
                <span className="bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] bg-clip-text text-transparent">
                  {gradientWord}
                </span>
              </>
            )}
          </h1>
          {subtitle && <p className="text-sm sm:text-base text-foreground/70 max-w-2xl mt-2">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
