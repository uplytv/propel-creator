import { useQuery } from '@tanstack/react-query';
import {
  fetchAlbum,
  fetchAlbumTracks,
  fetchCreatorTracks,
  fetchPlaylist,
  fetchPlaylistTracks,
  fetchTrack,
  fetchUserPlaylists,
} from '../lib/musicQueries';

export function useTrack(id: string | undefined) {
  return useQuery({
    queryKey: ['music', 'track', id],
    queryFn: () => fetchTrack(id!),
    enabled: !!id,
  });
}

export function useAlbum(id: string | undefined) {
  return useQuery({
    queryKey: ['music', 'album', id],
    queryFn: async () => {
      const [album, tracks] = await Promise.all([fetchAlbum(id!), fetchAlbumTracks(id!)]);
      return { album, tracks };
    },
    enabled: !!id,
  });
}

export function usePlaylist(id: string | undefined) {
  return useQuery({
    queryKey: ['music', 'playlist', id],
    queryFn: async () => {
      const [playlist, tracks] = await Promise.all([
        fetchPlaylist(id!),
        fetchPlaylistTracks(id!),
      ]);
      return { playlist, tracks };
    },
    enabled: !!id,
  });
}

export function useCreatorMusic(creatorId: string | undefined, includeUnpublished = false) {
  return useQuery({
    queryKey: ['music', 'creator', creatorId, includeUnpublished],
    queryFn: () => fetchCreatorTracks(creatorId!, includeUnpublished),
    enabled: !!creatorId,
  });
}

export function useUserPlaylists(userId: string | undefined) {
  return useQuery({
    queryKey: ['music', 'user-playlists', userId],
    queryFn: () => fetchUserPlaylists(userId!),
    enabled: !!userId,
  });
}
