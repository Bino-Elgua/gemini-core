-- User Quotas table
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  llm_token_limit BIGINT DEFAULT 1000000,
  image_generation_limit INT DEFAULT 500,
  video_rendering_limit INT DEFAULT 120,
  current_month TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage records table (tracks monthly usage)
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM format
  llm_tokens_used BIGINT DEFAULT 0,
  images_generated INT DEFAULT 0,
  video_minutes_rendered INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Audit logs table (tracks all user actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_month ON usage_records(month);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own quotas
CREATE POLICY "Users can read own quotas" ON user_quotas
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Users can read their own usage
CREATE POLICY "Users can read own usage" ON usage_records
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Only admins can update quotas
CREATE POLICY "Admins can update quotas" ON user_quotas
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Function to increment usage atomically
CREATE OR REPLACE FUNCTION increment_usage(
  user_id UUID,
  month_param TEXT,
  tokens_increment BIGINT DEFAULT 0,
  images_increment INT DEFAULT 0,
  videos_increment INT DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_records (user_id, month, llm_tokens_used, images_generated, video_minutes_rendered)
  VALUES (user_id, month_param, tokens_increment, images_increment, videos_increment)
  ON CONFLICT (user_id, month) DO UPDATE SET
    llm_tokens_used = usage_records.llm_tokens_used + tokens_increment,
    images_generated = usage_records.images_generated + images_increment,
    video_minutes_rendered = usage_records.video_minutes_rendered + videos_increment,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit(
  action TEXT,
  metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, metadata)
  VALUES (auth.uid(), action, metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
