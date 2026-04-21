import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart, MessageCircle, MoreHorizontal, EyeOff, Eye, Trash2, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useShortComments,
  useAddShortComment,
  useDeleteShortComment,
  useHideShortComment,
  useReportShortComment,
} from "@/hooks/useShortComments";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
  shortId?: string;
  source?: "clip" | "short";
  creatorId?: string;
}

export default function ShortsCommentSheet({ open, onClose, shortId, source, creatorId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: comments = [], isLoading } = useShortComments(shortId, source);
  const addComment = useAddShortComment(shortId, source);
  const deleteComment = useDeleteShortComment(shortId);
  const hideComment = useHideShortComment(shortId);
  const reportComment = useReportShortComment();
  const [body, setBody] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportDetails, setReportDetails] = useState("");

  const isCreator = !!user && !!creatorId && user.id === creatorId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!body.trim() || addComment.isPending) return;
    await addComment.mutateAsync(body);
    setBody("");
  };

  const submitReport = async () => {
    if (!reportTargetId) return;
    try {
      await reportComment.mutateAsync({
        commentId: reportTargetId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportTargetId(null);
      setReportDetails("");
      setReportReason("inappropriate");
    } catch {/* toast handled in hook */}
  };

  // Visible comments: hide hidden ones from non-creators (creator still sees them, dimmed)
  const visibleComments = comments.filter((c) => isCreator || !c.is_hidden);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[61] h-[75vh] rounded-t-2xl bg-card border-t border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {visibleComments.length} {visibleComments.length === 1 ? "Comment" : "Comments"}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close comments"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : visibleComments.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Be the first to comment</p>
                </div>
              ) : (
                visibleComments.map((c) => {
                  const isAuthor = user?.id === c.user_id;
                  const canDelete = isAuthor || isCreator;
                  return (
                    <div key={c.id} className={`flex gap-2.5 ${c.is_hidden ? "opacity-50" : ""}`}>
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {(c.display_name || "U").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {c.display_name || "Creator"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNowStrict(new Date(c.created_at), { addSuffix: true })}
                          </span>
                          {c.is_hidden && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed mt-0.5 break-words">{c.body}</p>
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Like comment"
                        >
                          <Heart className="w-3 h-3" /> {c.like_count || 0}
                        </button>
                      </div>

                      {/* Moderation menu */}
                      {user && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label="Comment options"
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors h-fit"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 z-[70]">
                            {isCreator && (
                              <DropdownMenuItem
                                onClick={() => hideComment.mutate({ commentId: c.id, hide: !c.is_hidden })}
                              >
                                {c.is_hidden ? (
                                  <><Eye className="w-3.5 h-3.5 mr-2" /> Show comment</>
                                ) : (
                                  <><EyeOff className="w-3.5 h-3.5 mr-2" /> Hide comment</>
                                )}
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => setConfirmDeleteId(c.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                            {!isAuthor && (
                              <>
                                {(isCreator || canDelete) && <DropdownMenuSeparator />}
                                <DropdownMenuItem onClick={() => setReportTargetId(c.id)}>
                                  <Flag className="w-3.5 h-3.5 mr-2" /> Report
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={submit}
              className="border-t border-border p-3 flex items-center gap-2 safe-area-bottom"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(user?.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={user ? "Add a comment…" : "Sign in to comment"}
                disabled={!user || addComment.isPending}
                className="flex-1 bg-muted/50 border border-border rounded-full px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                disabled={!body.trim() || addComment.isPending}
                aria-label="Post comment"
                className="px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </form>
          </motion.div>

          {/* Delete confirmation */}
          <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
            <AlertDialogContent className="z-[80]">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the comment. This action can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (confirmDeleteId) deleteComment.mutate(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Report dialog */}
          <Dialog open={!!reportTargetId} onOpenChange={(o) => !o && setReportTargetId(null)}>
            <DialogContent className="z-[80]">
              <DialogHeader>
                <DialogTitle>Report comment</DialogTitle>
                <DialogDescription>
                  Help us keep the community safe. Our team will review this report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[90]">
                      <SelectItem value="inappropriate">Inappropriate or offensive</SelectItem>
                      <SelectItem value="spam">Spam or scam</SelectItem>
                      <SelectItem value="harassment">Harassment or bullying</SelectItem>
                      <SelectItem value="hate">Hate speech</SelectItem>
                      <SelectItem value="violence">Violence or threats</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Additional details (optional)</Label>
                  <Textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Add any context that would help us review…"
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setReportTargetId(null)}>Cancel</Button>
                <Button onClick={submitReport} disabled={reportComment.isPending}>
                  {reportComment.isPending ? "Submitting…" : "Submit report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  );
}
