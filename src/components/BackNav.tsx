import { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

interface BackNavProps {
  fallback?: string;
  label?: string;
}

const BackNav = forwardRef<HTMLDivElement, BackNavProps>(function BackNav({ fallback = "/dashboard", label }, ref) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <div ref={ref} className="flex items-center gap-1 px-3 py-2">
      <button
        onClick={handleBack}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {label || "Back"}
      </button>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <Home className="w-4 h-4" />
      </button>
    </div>
  );
});

export default BackNav;
