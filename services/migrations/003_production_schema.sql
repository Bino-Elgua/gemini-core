-- Production Schema Migration (Sacred Core V2.0)
-- Objective: Establish persistent database foundation for 68 enterprise services
-- Target: Supabase (PostgreSQL)

-- 1. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_tier AS ENUM ('free', 'starter', 'pro', 'business', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_status AS ENUM ('success', 'failure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CORE TABLES

-- User Profiles (Auth handled by Supabase, this is extra data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier user_tier DEFAULT 'free',
  credits INTEGER DEFAULT 500,
  is_admin BOOLEAN DEFAULT FALSE,
  first_campaign_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company DNA Profiles
CREATE TABLE IF NOT EXISTS public.company_dna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  company_name TEXT NOT NULL,
  sector TEXT,
  niche TEXT,
  description TEXT,
  mission TEXT,
  values TEXT[],
  target_audience TEXT,
  tone TEXT,
  colors TEXT[],
  brand_personality TEXT,
  key_products TEXT[],
  uvp TEXT,
  content_pillars TEXT[],
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dna_id UUID REFERENCES public.company_dna(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  platforms TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (IG Reels, TikTok, LinkedIn, etc.)
CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'instagram_reel', 'tiktok_video', etc.
  content TEXT, -- Markdown or JSON
  image_url TEXT,
  video_url TEXT,
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);

-- Persistent Audit Logs (Proof #3 - REAL)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID, -- Added for future multi-tenant scaling
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status audit_status DEFAULT 'success',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: Prevent UPDATE or DELETE on audit_logs (Immutability)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Modification of audit logs is prohibited for compliance.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutability
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Credits Transactions
CREATE TABLE IF NOT EXISTS public.credits_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive for purchase, negative for deduction
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Cost Tracking (Actual Provider Costs)
CREATE TABLE IF NOT EXISTS public.provider_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- 'google-gemini', etc.
  model TEXT,
  operation TEXT NOT NULL,
  cost_usd DECIMAL(12, 10) NOT NULL, -- High precision for tiny LLM costs
  credits_deducted INTEGER,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Team/Live Sessions (Realtime DB Global Index)
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id TEXT PRIMARY KEY, -- sessionId from Firebase
  shard_id TEXT NOT NULL, -- shardUrl
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- DNA: Users can only see their own brand DNA
CREATE POLICY "Users can view own DNA" ON public.company_dna FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own DNA" ON public.company_dna FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Campaigns: Users can only see their own campaigns
CREATE POLICY "Users can view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id);

-- Audit Logs: Users can see their own logs, Admins can see all
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Credits: Only system/user can see transactions
CREATE POLICY "Users can view own credits" ON public.credits_transactions FOR SELECT USING (auth.uid() = user_id);

-- 5. PERFORMANCE INDEXES

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_dna_user_id ON public.company_dna(user_id);
CREATE INDEX idx_credits_user_id ON public.credits_transactions(user_id);

-- 6. FUNCTIONS & TRIGGERS

-- Automatically update updated_at on profile change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
