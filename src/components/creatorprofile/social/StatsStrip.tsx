import { Link } from "react-router-dom";
import { formatCount } from "@/lib/formatCount";

interface Stat {
  label: string;
  value: number;
  href?: string;
}

interface Props {
  stats: Stat[];
}

export default function StatsStrip({ stats }: Props) {
  if (!stats.length) return null;
  return (
    <nav
      aria-label="Profile stats"
      className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-4"
    >
      <ul className="grid grid-cols-4 gap-1 sm:gap-3">
        {stats.map((s) => {
          const Wrap: any = s.href ? Link : "div";
          const wrapProps = s.href ? { to: s.href } : {};
          return (
            <li key={s.label}>
              <Wrap
                {...wrapProps}
                className="block text-center min-h-[44px] py-2 rounded-md hover:bg-muted/40 transition"
              >
                <div className="font-heading font-semibold text-foreground text-base sm:text-lg">
                  {formatCount(s.value)}
                </div>
                <div className="text-[11px] sm:text-xs uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </div>
              </Wrap>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
