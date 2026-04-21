interface UplyLogoProps {
  size?: number;
  showWord?: boolean;
  className?: string;
  color?: string;
}

export default function UplyLogo({ size = 40, showWord = false, className = "", color = "#00FF85" }: UplyLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="UPLY"
      >
        <circle cx="13" cy="14" r="2.8" fill={color} />
        <circle cx="27" cy="14" r="2.8" fill={color} />
        <path
          d="M8 14 L8 22 C8 29.5 13 33.5 20 33.5 C27 33.5 32 29.5 32 22 L32 14"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showWord && (
        <span
          className="font-extrabold tracking-tight"
          style={{ color, fontSize: size * 0.55, letterSpacing: "-0.02em" }}
        >
          UPLY
        </span>
      )}
    </div>
  );
}
