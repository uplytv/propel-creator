import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DOMPurify from "isomorphic-dompurify";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  htmlBody: string;
  creatorName: string;
  creatorAvatar?: string | null;
}

// HTML-encode plain text values before interpolating into the preview template.
function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only allow http(s) image URLs (no javascript:, data:, etc.) for the avatar.
function safeAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* fall through */
  }
  return null;
}

export default function EmailPreview({ open, onOpenChange, subject, htmlBody, creatorName, creatorAvatar }: Props) {
  const safeSubject = escapeHtml(subject || "Your Subject Line");
  const safeCreatorName = escapeHtml(creatorName || "");
  const initial = escapeHtml((creatorName?.[0] || "?"));
  const safeAvatar = safeAvatarUrl(creatorAvatar);
  // Sanitize the user-authored HTML body before embedding it.
  const safeBody = DOMPurify.sanitize(htmlBody || '<p style="color:#666;">Your email content will appear here...</p>');

  const previewHtml = `
    <div style="font-family:Arial,sans-serif;background:#0A0A0A;padding:32px 16px;">
      <div style="max-width:600px;margin:0 auto;background:#111111;border:1px solid #1E1E1E;border-radius:16px;overflow:hidden;">
        <div style="padding:24px;border-bottom:1px solid #1E1E1E;display:flex;align-items:center;gap:12px;">
          ${safeAvatar
            ? `<img src="${escapeHtml(safeAvatar)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />`
            : `<div style="width:36px;height:36px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:14px;">${initial}</div>`
          }
          <div>
            <div style="color:#ffffff;font-weight:600;font-size:14px;">${safeCreatorName}</div>
            <div style="color:#666;font-size:11px;">via UPLY</div>
          </div>
        </div>
        <div style="padding:24px;">
          <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 16px;">${safeSubject}</h1>
          <div style="color:#cccccc;font-size:14px;line-height:1.7;">
            ${safeBody}
          </div>
        </div>
        <div style="padding:16px 24px;border-top:1px solid #1E1E1E;text-align:center;">
          <div style="color:#00FF85;font-weight:700;font-size:11px;letter-spacing:1px;">UPLY</div>
          <div style="color:#444;font-size:10px;margin-top:4px;">Unsubscribe</div>
        </div>
      </div>
    </div>
  `;

  // The template is built from sanitized + escaped pieces above, then run
  // through DOMPurify one more time for defense in depth.
  const finalHtml = DOMPurify.sanitize(previewHtml, { ADD_ATTR: ["style"] });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm">Email Preview</DialogTitle>
        </DialogHeader>
        <div
          className="rounded-b-xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: finalHtml }}
        />
      </DialogContent>
    </Dialog>
  );
}
