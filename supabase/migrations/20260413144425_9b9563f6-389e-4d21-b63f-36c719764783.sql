
-- Auto-download preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_download_recordings BOOLEAN DEFAULT false;

-- Upload job tracking
CREATE TABLE IF NOT EXISTS upload_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mux_upload_id TEXT,
  mux_asset_id TEXT,
  progress_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'uploading',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload jobs" ON upload_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload jobs" ON upload_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own upload jobs" ON upload_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own upload jobs" ON upload_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for stream_recordings (videos already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_recordings;
