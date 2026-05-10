export type AudioStatus = 'pending' | 'processing' | 'ready' | 'errored';
export type MonetizationType = 'free' | 'paid' | 'subscriber_only';
export type AlbumType = 'single' | 'ep' | 'album';

export interface Track {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  genre: string | null;
  cover_art_url: string | null;
  audio_mux_asset_id: string | null;
  audio_mux_playback_id: string | null;
  audio_upload_id: string | null;
  audio_status: AudioStatus;
  duration_seconds: number | null;
  is_published: boolean;
  is_explicit: boolean;
  monetization_type: MonetizationType;
  play_count: number;
  like_count: number;
  release_date: string | null;
  price_cents?: number;
  is_paid?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  cover_art_url: string | null;
  album_type: AlbumType;
  release_date: string | null;
  is_published: boolean;
  created_at: string;
}

export interface MusicPlaylist {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_art_url: string | null;
  is_public: boolean;
  created_at: string;
}
