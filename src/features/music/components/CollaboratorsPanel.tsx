import { useState } from "react";
import { Users, Link2, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  usePlaylistCollaborators,
  usePlaylistInvites,
  useCreatePlaylistInvite,
  useRemoveCollaborator,
} from "../hooks/usePlaylistCollaborators";

export function CollaboratorsPanel({
  playlistId,
  isOwner,
}: {
  playlistId: string;
  isOwner: boolean;
}) {
  const { data: collabs = [] } = usePlaylistCollaborators(playlistId);
  const { data: invites = [] } = usePlaylistInvites(playlistId);
  const create = useCreatePlaylistInvite();
  const remove = useRemoveCollaborator();
  const [role, setRole] = useState<"editor" | "viewer">("editor");

  const generate = async () => {
    try {
      const inv = await create.mutateAsync({ playlistId, role });
      const url = `${window.location.origin}/music/playlist-invite/${inv.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate invite");
    }
  };

  const copyInvite = async (token: string) => {
    const url = `${window.location.origin}/music/playlist-invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Copied");
  };

  return (
    <section className="rounded-xl bg-card/40 border border-border/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Collaborators</h2>
        <span className="text-xs text-muted-foreground ml-auto">{collabs.length}</span>
      </div>

      {collabs.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">
          No collaborators yet. Invite someone to co-edit this playlist.
        </p>
      ) : (
        <ul className="space-y-2 mb-3">
          {collabs.map((c) => (
            <li key={c.user_id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs truncate">{c.user_id.slice(0, 8)}…</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                {isOwner && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => remove.mutate({ playlistId, userId: c.user_id })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="text-xs bg-background border border-border rounded px-2 h-9"
              style={{ fontSize: 16 }}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button size="sm" onClick={generate} disabled={create.isPending}>
              <Link2 className="h-4 w-4 mr-1" /> Invite link
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="border-t border-border/30 pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">Pending invites</div>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono truncate">{inv.token.slice(0, 12)}…</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyInvite(inv.token)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
