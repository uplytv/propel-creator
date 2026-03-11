import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

interface BackNavProps {
  fallback?: string;
  label?: string;
}

export default function BackNav({ fallback = "/dashboard", label }: BackNavProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2">
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
}
