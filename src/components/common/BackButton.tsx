import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Floating top-left back button. Uses browser history when available,
 * otherwise falls back to the supplied `fallback` route (default "/").
 */
export default function BackButton({
  fallback = "/",
  label = "Back",
  className = "",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const onClick = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`fixed top-3 left-3 z-50 inline-flex items-center gap-1.5 h-10 min-w-[44px] px-3 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[12px] font-semibold hover:bg-black/80 transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
