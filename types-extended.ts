// Core Models
export interface Portfolio {
  id: string;
  name: string;
  description: string;
  userId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  tone: string;
  values: string[];
  mission: string;
  targetAudience: string;
  createdAt: Date;
  updatedAt: Date;
  teamMembers?: TeamMember[];
}

export interface Campaign {
  id: string;
  portfolioId: string;
  name: string;
  goal: 'awareness' | 'leads' | 'sales' | 'engagement';
  channels: Channel[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  assets: Asset[];
  budget?: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  campaignId: string;
  type: 'image' | 'copy' | 'video' | 'html';
  content: string;
  provider: string;
  cost?: number;
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    engagement: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  portfolioId: string;
  name: string;
  email: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  score: number;
  source: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  permissions: string[];
}

export interface Channel {
  name: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'email' | 'sms' | 'tiktok';
  enabled: boolean;
  credentials?: Record<string, string>;
}

// Affiliate System
export interface AffiliatePartner {
  id: string;
  name: string;
  email: string;
  commission_rate: number;
  status: 'pending' | 'active' | 'inactive';
  referral_link: string;
  total_referrals: number;
  total_revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateConversion {
  id: string;
  partnerId: string;
  userId: string;
  amount: number;
  commission: number;
  status: 'pending' | 'paid';
  createdAt: Date;
}

// Battle Mode
export interface BattleResult {
  id: string;
  brand1Id: string;
  brand2Id: string;
  scores: {
    clarity: number;
    messaging: number;
    values: number;
    audience: number;
    differentiation: number;
    voice: number;
    emotional: number;
    market: number;
  };
  winner: string;
  recommendations: string[];
  createdAt: Date;
}

// Sonic Branding
export interface SonicBrand {
  id: string;
  portfolioId: string;
  voiceProfile: string;
  pitch: number;
  tone: string;
  assets: SonicAsset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SonicAsset {
  id: string;
  type: 'intro' | 'outro' | 'logo' | 'jingle';
  url: string;
  provider: string;
  duration: number;
}

// Workflow/Automation
export interface Workflow {
  id: string;
  portfolioId: string;
  name: string;
  trigger: string;
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowAction {
  id: string;
  type: string;
  provider: string;
  config: Record<string, any>;
  order: number;
}

// Provider Configuration
export interface ProviderConfig {
  name: string;
  type: 'llm' | 'image' | 'video' | 'voice' | 'email' | 'social' | 'workflow';
  apiKey?: string;
  isConfigured: boolean;
  costPerUnit?: number;
  status: 'available' | 'unavailable' | 'error';
  lastChecked?: Date;
}

// Service Response Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Generation Requests
export interface ImageGenerationRequest {
  prompt: string;
  provider?: string;
  style?: string;
  width?: number;
  height?: number;
}

export interface VideoGenerationRequest {
  prompt: string;
  provider?: string;
  duration?: number;
  aspectRatio?: string;
}

export interface TextGenerationRequest {
  prompt: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SocialPostRequest {
  content: string;
  platforms: Channel[];
  scheduledFor?: Date;
  media?: string[];
}

// Analytics
export interface CampaignAnalytics {
  campaignId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  roi: number;
  costPerConversion: number;
  topAssets: Asset[];
  topChannels: Channel[];
}

// Health Check
export interface HealthStatus {
  timestamp: Date;
  providers: ProviderStatus[];
  status: 'healthy' | 'degraded' | 'error';
}

export interface ProviderStatus {
  name: string;
  status: 'available' | 'unavailable' | 'error';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

// Collaboration
export interface CollaborationSession {
  id: string;
  portfolioId: string;
  participants: Participant[];
  edits: EditLog[];
  comments: Comment[];
  startedAt: Date;
  endedAt?: Date;
}

export interface Participant {
  userId: string;
  email: string;
  joinedAt: Date;
  cursorPosition?: { x: number; y: number };
}

export interface EditLog {
  id: string;
  userId: string;
  action: string;
  target: string;
  changes: Record<string, any>;
  timestamp: Date;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  replies: Comment[];
  timestamp: Date;
  resolved: boolean;
}
