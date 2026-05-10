import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BookOpen, MessageSquare } from "lucide-react";
import type { LyricSheet } from "../hooks/useLyricAnnotations";

interface Props {
  sheet: LyricSheet;
  onClick?: () => void;
}

export function LyricSheetCard({ sheet, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{sheet.track_title}</h3>
            {sheet.status === "draft" && (
              <Badge variant="outline" className="capitalize">draft</Badge>
            )}
          </div>
          {sheet.artist_label && (
            <p className="text-sm text-muted-foreground truncate">{sheet.artist_label}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {sheet.annotation_count} annotations
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
