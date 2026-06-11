import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

export default function UploadProgressBar() {
  const { user } = useAuth();

  const { data: activeUpload } = useQuery({
    queryKey: ["active-upload", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("upload_jobs")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["uploading", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 2000,
  });

  if (!activeUpload) return null;

  const isProcessing = activeUpload.status === "processing";
  const progress = isProcessing ? 100 : (activeUpload.progress_percent || 0);

  return (
    <div
      className="sticky top-0 z-[39] flex items-center gap-3 px-4 py-2 border-b"
      style={{
        background: "rgba(0, 20, 10, 0.97)",
        borderColor: "rgba(61, 124, 255,0.3)",
      }}
    >
      <Upload className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="text-xs text-white truncate flex-1">
        {activeUpload.file_name}
      </span>
      <div className="flex-[2] h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: isProcessing
              ? "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--warning)))"
              : "hsl(var(--primary))",
          }}
        />
      </div>
      <span className="text-xs font-bold text-primary w-9 text-right flex-shrink-0">
        {isProcessing ? "⚙️" : `${progress}%`}
      </span>
    </div>
  );
}
