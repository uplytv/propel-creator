import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Plus, X, Lock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePlaylistCollaborators,
  useAddCollaborator,
  useRemoveCollaborator,
  useTogglePlaylistCollaborative,
} from '../hooks/usePlaylistCollaborators';
import { useAuth } from '@/context/AuthContext';

interface Props {
  playlistId: string;
  ownerId: string;
  isCollaborative: boolean;
}

export default function CollaboratorsPanel({ playlistId, ownerId, isCollaborative }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const isOwner = user?.id === ownerId;

  const { data: collabs = [] } = usePlaylistCollaborators(playlistId);
  const add = useAddCollaborator(playlistId);
  const remove = useRemoveCollaborator(playlistId);
  const toggle = useTogglePlaylistCollaborative(playlistId);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await add.mutateAsync(username);
      setUsername('');
      toast.success('Collaborator added');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not add collaborator');
    }
  };

  const handleToggle = async () => {
    try {
      await toggle.mutateAsync(!isCollaborative);
      qc.invalidateQueries({ queryKey: ['music', 'playlist', playlistId] });
      toast.success(isCollaborative ? 'Now private' : 'Collaborative mode on');
    } catch {
      toast.error('Could not update playlist');
    }
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-white" />
          <div className="text-sm font-bold text-white">
            {isCollaborative ? 'Collaborative' : 'Solo playlist'}
          </div>
          <div className="flex -space-x-2 ml-2">
            {collabs.slice(0, 5).map((c) =>
              c.avatar_url ? (
                <img
                  key={c.user_id}
                  src={c.avatar_url}
                  alt={c.display_name ?? ''}
                  className="w-6 h-6 rounded-full border-2 border-[#0A0A0A] object-cover"
                />
              ) : (
                <div
                  key={c.user_id}
                  className="w-6 h-6 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
                >
                  {(c.display_name ?? c.username ?? '?').slice(0, 1).toUpperCase()}
                </div>
              ),
            )}
          </div>
        </div>
        {isOwner && (
          <button
            onClick={handleToggle}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              isCollaborative
                ? 'bg-[#00FF85] text-black'
                : 'bg-white/10 text-white'
            }`}
          >
            {isCollaborative ? 'On' : 'Off'}
          </button>
        )}
      </div>

      {isCollaborative && (
        <button
          onClick={() => setOpen((s) => !s)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
        >
          {open ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {open ? 'Hide collaborators' : `Manage collaborators (${collabs.length})`}
        </button>
      )}

      {!isCollaborative && isOwner && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <Lock className="w-3 h-3" /> Only you can edit. Turn on to invite friends.
        </div>
      )}

      {open && isCollaborative && (
        <div className="mt-3 space-y-3">
          {isOwner && (
            <form onSubmit={handleAdd} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                <UserPlus className="w-4 h-4 text-white/50" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Add by @username"
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
                  style={{ fontSize: 16 }}
                />
              </div>
              <button
                type="submit"
                disabled={add.isPending || !username.trim()}
                className="px-4 py-2 rounded-full bg-[#00FF85] text-black text-sm font-bold disabled:opacity-50"
              >
                Add
              </button>
            </form>
          )}
          <div className="space-y-1">
            {collabs.length === 0 && (
              <div className="text-xs text-white/40">No collaborators yet.</div>
            )}
            {collabs.map((c) => (
              <div
                key={c.user_id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5"
              >
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
                  >
                    {(c.display_name ?? c.username ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="text-sm text-white truncate flex-1">
                  {c.display_name || (c.username ? `@${c.username}` : 'Anonymous')}
                </div>
                {(isOwner || c.user_id === user?.id) && (
                  <button
                    onClick={async () => {
                      try {
                        await remove.mutateAsync(c.user_id);
                        toast.success('Removed');
                      } catch {
                        toast.error('Could not remove');
                      }
                    }}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    {c.user_id === user?.id ? 'Leave' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
