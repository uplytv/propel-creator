import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAcceptPlaylistInvite } from "../hooks/usePlaylistCollaborators";
import { toast } from "sonner";

export default function PlaylistInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const accept = useAcceptPlaylistInvite();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (!user) {
      navigate(`/auth?redirect=/music/playlist-invite/${token}`, { replace: true });
      return;
    }
    accept
      .mutateAsync(token)
      .then((playlistId) => {
        toast.success("You're now a collaborator");
        navigate(`/music/playlist/${playlistId}`, { replace: true });
      })
      .catch((e: any) => setError(e?.message ?? "Could not accept invite"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  return (
    <div className="mobile-safe-content px-4 pt-12 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-display font-bold mb-2">Invite issue</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Joining playlist…</p>
      )}
    </div>
  );
}
