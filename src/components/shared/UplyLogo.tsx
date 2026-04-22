interface UplyLogoProps {
  size?: number;
  /** Kept for API compatibility — the wordmark is always rendered as the brand mark. */
  showWord?: boolean;
  className?: string;
  /** Optional override. When omitted, the brand purple gradient is used. */
  color?: string;
}

/**
 * UPLY brand wordmark — purple gradient "Uply" with a smile under the U.
 * Matches the original brand identity (purple, not green).
 */
export default function UplyLogo({ size = 40, className = "", color }: UplyLogoProps) {
  // Width:height ratio of the wordmark
  const height = size;
  const width = Math.round(size * 3.2);
  const gradientId = `uply-purple-gradient-${size}`;

  const fill = color ?? `url(#${gradientId})`;

  return (
    <div className={`inline-flex items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 320 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Uply"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7B3FF2" />
            <stop offset="100%" stopColor="#B026FF" />
          </linearGradient>
        </defs>

        {/* "U" with smile dots */}
        <text
          x="0"
          y="78"
          fontFamily="ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="96"
          letterSpacing="-6"
          fill={fill}
        >
          Uply
        </text>

        {/* Smile eyes inside the U */}
        <circle cx="20" cy="38" r="5" fill={fill} />
        <circle cx="48" cy="38" r="5" fill={fill} />
      </svg>
    </div>
  );
}
