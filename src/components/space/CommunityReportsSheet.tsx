import { Flag, Check, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useOpenReports, useUpdateReportStatus, type CommunityReport } from "@/hooks/useCommunityModeration";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  onJumpToPost: (postId: string) => void;
}

const TYPE_LABEL: Record<CommunityReport["content_type"], string> = {
  post: "Post",
  comment: "Comment",
  chat: "Chat message",
};

export default function CommunityReportsSheet({ open, onOpenChange, creatorId, onJumpToPost }: Props) {
  const { data: reports = [], isLoading } = useOpenReports(creatorId, open);
  const updateStatus = useUpdateReportStatus();

  const handleStatus = async (reportId: string, status: "resolved" | "dismissed") => {
    try {
      await updateStatus.mutateAsync({ reportId, status });
      toast.success(status === "resolved" ? "Report resolved" : "Report dismissed");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-primary" /> Reports
          </SheetTitle>
          <SheetDescription>Open reports from your community members.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 rounded-lg bg-muted animate-pulse h-24" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center">
              <Flag className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground mb-1">No open reports</p>
              <p className="text-xs text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground">
                    {TYPE_LABEL[report.content_type]}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-3 break-words">{report.content_preview}</p>
                <p className="text-xs text-muted-foreground">
                  Reported by <span className="font-medium text-foreground">{report.reporter_name}</span>
                  {report.reason && <> — “{report.reason}”</>}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={updateStatus.isPending}
                    onClick={() => handleStatus(report.id, "resolved")}
                  >
                    <Check className="w-3 h-3" /> Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    disabled={updateStatus.isPending}
                    onClick={() => handleStatus(report.id, "dismissed")}
                  >
                    <X className="w-3 h-3" /> Dismiss
                  </Button>
                  {report.jump_post_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 ml-auto text-primary"
                      onClick={() => {
                        onOpenChange(false);
                        onJumpToPost(report.jump_post_id!);
                      }}
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
