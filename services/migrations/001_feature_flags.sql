-- Feature Flags table for toggling features without deployment
-- Run this in Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Enable Row Level Security
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to feature flags" ON feature_flags
  FOR SELECT
  USING (TRUE);

-- Allow admin/owner to update
CREATE POLICY "Allow admin to update feature flags" ON feature_flags
  FOR UPDATE
  USING (auth.uid() = owner_id OR (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin')
  WITH CHECK (auth.uid() = owner_id OR (SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin');

-- Insert default feature flags
INSERT INTO feature_flags (name, enabled, description) VALUES
  ('video_generation', true, 'Enable video generation features (LTX, Luma, Kling)'),
  ('image_generation', true, 'Enable image generation features (DALLE-3, Stability)'),
  ('competitor_analysis', true, 'Enable competitor analysis dashboard'),
  ('ai_optimization', true, 'Enable autonomous AI campaign optimization'),
  ('advanced_analytics', true, 'Enable advanced analytics and reporting'),
  ('affiliate_program', true, 'Enable affiliate marketing features'),
  ('webhook_integrations', true, 'Enable webhook event delivery'),
  ('multi_region_sync', false, 'Enable multi-region Supabase replication'),
  ('beta_ai_features', false, 'Enable experimental AI features'),
  ('performance_mode', false, 'Enable performance optimizations')
ON CONFLICT (name) DO NOTHING;
