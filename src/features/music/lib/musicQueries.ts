import { supabase } from '@/integrations/supabase/client';
import type { Track, Album, MusicPlaylist } from '../types';

// All new music tables aren't in generated types yet — cast through unknown.
const sb = supabase as unknown as any;

export async function fetchTrack(id: string): Promise<Track | null> {
  const { data } = await sb.from('tracks').select('*').eq('id', id).maybeSingle();
  return (data as Track) ?? null;
}

export async function fetchPublishedTracks(limit = 24): Promise<Track[]> {
  // Try the new releases RPC first (filtered by audio_status='ready'), fall back to a plain query.
  try {
    const { data, error } = await sb.rpc('recs_new_releases', { p_limit: limit });
    if (!error && Array.isArray(data) && data.length > 0) return data as Track[];
  } catch (_) { /* fall through */ }
  const { data } = await sb
    .from('tracks')
    .select('*')
    .eq('is_published', true)
    .order('release_date', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as Track[]) ?? [];
}

export async function fetchTrendingTracks(limit = 24): Promise<Track[]> {
  // Recency-weighted trending RPC (last 7d play counts) with fallback to all-time play_count.
  try {
    const { data, error } = await sb.rpc('recs_trending', { p_limit: limit });
    if (!error && Array.isArray(data) && data.length > 0) return data as Track[];
  } catch (_) { /* fall through */ }
  const { data } = await sb
    .from('tracks')
    .select('*')
    .eq('is_published', true)
    .order('play_count', { ascending: false })
    .limit(limit);
  return (data as Track[]) ?? [];
}

export async function fetchForYouTracks(userId?: string | null, limit = 24): Promise<Track[]> {
  // Personalized RPC when we have a user + taste profile; otherwise heuristic fallback.
  if (userId) {
    try {
      const { data, error } = await sb.rpc('recs_for_you', { p_user: userId, p_limit: limit });
      if (!error && Array.isArray(data) && data.length > 0) return data as Track[];
    } catch (_) { /* fall through */ }
  }
  const { data } = await sb
    .from('tracks')
    .select('*')
    .eq('is_published', true)
    .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
    .limit(80);
  const list = ((data as Track[]) ?? []).slice();
  list.sort(
    (a, b) =>
      (Number(b.play_count) * 0.6 + Number(b.like_count) * 0.4) -
      (Number(a.play_count) * 0.6 + Number(a.like_count) * 0.4),
  );
  return list.slice(0, limit);
}

export async function fetchTracksByGenre(genre: string, limit = 48): Promise<Track[]> {
  const { data } = await sb
    .from('tracks')
    .select('*')
    .eq('is_published', true)
    .eq('genre', genre)
    .order('release_date', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as Track[]) ?? [];
}

export async function fetchTracksFromCreators(
  creatorIds: string[],
  limit = 24,
): Promise<Track[]> {
  if (!creatorIds.length) return [];
  const { data } = await sb
    .from('tracks')
    .select('*')
    .eq('is_published', true)
    .in('creator_id', creatorIds)
    .order('release_date', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as Track[]) ?? [];
}

export async function fetchCreatorTracks(
  creatorId: string,
  includeUnpublished = false,
): Promise<Track[]> {
  let q = sb.from('tracks').select('*').eq('creator_id', creatorId);
  if (!includeUnpublished) q = q.eq('is_published', true);
  const { data } = await q.order('created_at', { ascending: false }).limit(100);
  return (data as Track[]) ?? [];
}

export async function fetchAlbum(id: string): Promise<Album | null> {
  const { data } = await sb.from('albums').select('*').eq('id', id).maybeSingle();
  return (data as Album) ?? null;
}

export async function fetchAlbumTracks(albumId: string): Promise<Track[]> {
  const { data } = await sb
    .from('album_tracks')
    .select('track_number, tracks(*)')
    .eq('album_id', albumId)
    .order('track_number', { ascending: true });
  return ((data as any[]) ?? []).map((r) => r.tracks as Track).filter(Boolean);
}

export async function fetchPlaylist(id: string): Promise<MusicPlaylist | null> {
  const { data } = await sb.from('music_playlists').select('*').eq('id', id).maybeSingle();
  return (data as MusicPlaylist) ?? null;
}

export async function fetchPlaylistTracks(playlistId: string): Promise<Track[]> {
  const { data } = await sb
    .from('music_playlist_tracks')
    .select('position, tracks(*)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  return ((data as any[]) ?? []).map((r) => r.tracks as Track).filter(Boolean);
}

export async function fetchUserPlaylists(userId: string): Promise<MusicPlaylist[]> {
  const { data } = await sb
    .from('music_playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as MusicPlaylist[]) ?? [];
}

export async function searchMusic(q: string): Promise<{ tracks: Track[]; albums: Album[] }> {
  const term = `%${q}%`;
  const [{ data: t }, { data: a }] = await Promise.all([
    sb.from('tracks').select('*').eq('is_published', true).ilike('title', term).limit(40),
    sb.from('albums').select('*').eq('is_published', true).ilike('title', term).limit(20),
  ]);
  return { tracks: (t as Track[]) ?? [], albums: (a as Album[]) ?? [] };
}

export type SearchSort = 'relevance' | 'newest' | 'popular';
export type DurationBucket = 'any' | 'short' | 'medium' | 'long';

export interface SearchFilters {
  genres?: string[];
  moodGenres?: string[]; // pre-expanded genres from a mood
  hideExplicit?: boolean;
  monetization?: 'any' | 'free' | 'paid';
  duration?: DurationBucket;
  sort?: SearchSort;
}

export async function searchMusicAdvanced(
  q: string,
  filters: SearchFilters = {},
): Promise<{ tracks: Track[]; albums: Album[] }> {
  const term = q.trim();
  const allowedGenres = [
    ...(filters.genres ?? []),
    ...(filters.moodGenres ?? []),
  ];
  const uniqueGenres = Array.from(new Set(allowedGenres));

  let tq = sb.from('tracks').select('*').eq('is_published', true).eq('audio_status', 'ready');
  if (term) {
    // Postgres full-text search via the maintained `search_vector` column.
    tq = tq.textSearch('search_vector', term, { type: 'websearch', config: 'simple' });
  }
  if (uniqueGenres.length) tq = tq.in('genre', uniqueGenres);
  if (filters.hideExplicit) tq = tq.eq('is_explicit', false);
  if (filters.monetization && filters.monetization !== 'any') {
    tq = tq.eq('monetization_type', filters.monetization);
  }
  if (filters.duration === 'short') tq = tq.lte('duration_seconds', 120);
  else if (filters.duration === 'medium')
    tq = tq.gt('duration_seconds', 120).lte('duration_seconds', 300);
  else if (filters.duration === 'long') tq = tq.gt('duration_seconds', 300);

  const sort = filters.sort ?? (term ? 'relevance' : 'popular');
  if (sort === 'newest')
    tq = tq.order('release_date', { ascending: false, nullsFirst: false });
  else if (sort === 'popular') tq = tq.order('play_count', { ascending: false });
  else
    tq = tq
      .order('play_count', { ascending: false })
      .order('like_count', { ascending: false });

  let aq = sb.from('albums').select('*').eq('is_published', true);
  if (term) {
    aq = aq.textSearch('search_vector', term, { type: 'websearch', config: 'simple' });
  }
  aq = aq.order('release_date', { ascending: false, nullsFirst: false }).limit(20);

  const [{ data: t }, { data: a }] = await Promise.all([tq.limit(60), aq]);
  return { tracks: (t as Track[]) ?? [], albums: (a as Album[]) ?? [] };
}

/**
 * Lightweight typeahead — uses the `search_music` SECURITY DEFINER RPC which
 * returns ranked tracks and albums with creator subtitle. Used for instant
 * suggestions while the user is typing.
 */
export interface SearchSuggestion {
  kind: 'track' | 'album';
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  rank: number;
}

export async function searchMusicTypeahead(
  q: string,
  limit = 12,
): Promise<SearchSuggestion[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  try {
    const { data, error } = await sb.rpc('search_music', { p_query: term, p_limit: limit });
    if (error) return [];
    return (data ?? []) as SearchSuggestion[];
  } catch {
    return [];
  }
}

export interface ChartFilters {
  genres?: string[];
  windowDays?: number; // restrict to tracks released within window
}

export async function fetchChartTracks(
  filters: ChartFilters = {},
  limit = 50,
): Promise<Track[]> {
  let q = sb.from('tracks').select('*').eq('is_published', true);
  if (filters.genres?.length) q = q.in('genre', filters.genres);
  if (filters.windowDays && filters.windowDays > 0) {
    const since = new Date(
      Date.now() - filters.windowDays * 86400_000,
    ).toISOString();
    q = q.gte('created_at', since);
  }
  const { data } = await q
    .order('play_count', { ascending: false })
    .order('like_count', { ascending: false })
    .limit(limit);
  return (data as Track[]) ?? [];
}

export function muxHlsUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function coverArtUrl(track: Pick<Track, 'cover_art_url'>): string | null {
  return track.cover_art_url || null;
}

export async function uploadCoverArt(
  userId: string,
  file: File,
): Promise<string | null> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('music-art').upload(path, file, {
    upsert: false,
    contentType: file.type,
  });
  if (error) return null;
  const { data } = sb.storage.from('music-art').getPublicUrl(path);
  return data?.publicUrl ?? null;
}
