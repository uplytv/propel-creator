import { format } from "date-fns";
import { Award, Loader2, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCertificateData } from "@/hooks/useCourseDepth";

/**
 * Course-completion certificate — printable view (window.print, same CSS
 * pattern as ReceiptSheet: hide everything, neutralize the dialog chrome, let
 * the certificate own the printed page). "Save as PDF" in the print dialog
 * covers the PDF need without a jspdf layout.
 */
export default function CourseCertificate({
  open,
  onClose,
  creatorId,
  lessonIds,
}: {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  lessonIds: string[];
}) {
  const { data, isLoading } = useCertificateData(creatorId, lessonIds, open);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-uply-cert-host="" className="bg-card border-border max-w-2xl">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            [data-uply-cert], [data-uply-cert] * { visibility: visible !important; }
            [data-uply-cert-host] {
              position: static !important;
              transform: none !important;
              width: auto !important;
              max-width: none !important;
              height: auto !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
            }
            [data-uply-cert] {
              position: absolute !important;
              left: 0; top: 0;
              width: 100%;
              background: #fff !important;
              color: #000 !important;
            }
          }
        `}</style>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Certificate of Completion
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparing your certificate…
          </div>
        ) : (
          <div className="space-y-4">
            <div data-uply-cert="" className="relative overflow-hidden border border-border bg-background">
              {/* Brand gradient accent */}
              <div className="h-2" style={{ background: "linear-gradient(135deg, #3D7CFF 0%, #B025FF 100%)" }} />

              <div className="px-8 py-10 text-center space-y-5">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="text-lg font-extrabold tracking-tight"
                    style={{
                      background: "linear-gradient(135deg, #3D7CFF 0%, #B025FF 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    UPLY
                  </span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Certificate of Completion</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">This certifies that</p>
                  <p className="text-3xl font-extrabold text-foreground leading-tight">{data.studentName}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">has successfully completed all lessons of</p>
                  <p className="text-xl font-bold text-foreground leading-snug">{data.courseName}</p>
                  <p className="text-sm text-muted-foreground">by {data.creatorName}</p>
                </div>

                <div className="pt-4 flex items-center justify-center">
                  <div className="w-40 border-t border-border pt-2">
                    <p className="text-sm font-semibold text-foreground">{format(new Date(data.completedAt), "MMMM d, yyyy")}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date of completion</p>
                  </div>
                </div>
              </div>

              <div className="h-2" style={{ background: "linear-gradient(315deg, #3D7CFF 0%, #B025FF 100%)" }} />
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
