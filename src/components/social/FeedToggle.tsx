import { motion } from "framer-motion";

interface Props {
  value: "for-you" | "following";
  onChange: (v: "for-you" | "following") => void;
  className?: string;
}

/**
 * IG/TikTok-style top toggle: For You ↔ Following.
 */
export default function FeedToggle({ value, onChange, className = "" }: Props) {
  const tabs: { id: "for-you" | "following"; label: string }[] = [
    { id: "following", label: "Following" },
    { id: "for-you", label: "For You" },
  ];

  return (
    <div className={`flex items-center justify-center gap-6 py-2.5 ${className}`}>
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative px-1 pb-1 text-sm font-bold transition-colors ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
            {active && (
              <motion.span
                layoutId="feed-toggle-underline"
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-foreground"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
