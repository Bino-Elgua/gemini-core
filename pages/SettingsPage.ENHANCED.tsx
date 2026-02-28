import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  Settings, Zap, Shield, Activity, RefreshCw, 
  Cpu, Eye, EyeOff, Cloud, Database, ExternalLink, 
  CheckCircle2, AlertCircle, Play, Workflow, Palette, Film,
  ChevronDown, Globe, Box, Terminal, Layers, Sparkles, Users,
  Power, ZapOff, Headphones, Music, Wand2, Infinity
} from 'lucide-react';
import TierSelector from '../components/TierSelector';
import CreditsWallet from '../components/CreditsWallet';

// --- GOOGLE-ONLY PROVIDERS ---
const GOOGLE_PROVIDERS = {
  llm: {
    id: 'gemini',
    name: 'Google Gemini',
    icon: Cpu,
    type: 'LLM',
    docs: 'https://ai.google.dev/docs',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    description: 'Advanced reasoning, 128k context, function calling'
  },
  image: {
    id: 'imagen',
    name: 'Google Imagen 3',
    icon: Palette,
    type: 'Image',
    docs: 'https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview',
    models: ['imagen-3-fast', 'imagen-3-quality'],
    description: 'Photorealistic + illustrated generation'
  },
  video: {
    id: 'veo',
    name: 'Google Veo 3',
    icon: Film,
    type: 'Video',
    docs: 'https://cloud.google.com/vertex-ai/docs/generative-ai/video/overview',
    models: ['veo-3.1-fast-generate-preview'],
    description: '720p-1080p, 10-60 second videos'
  },
  audio: {
    id: 'lyria',
    name: 'Google Lyria 3',
    icon: Music,
    type: 'Audio',
    docs: 'https://deepmind.google/discover/blog/lyria-and-musiclm/',
    models: ['lyria-3-gen-preview'],
    description: 'Music, jingles, voice synthesis'
  }
};

const ProviderCard = ({ provider, isActive, onActivate }: any) => {
  const Icon = provider.icon;
  
  return (
    <div className={`group bg-gradient-to-br from-zinc-900 to-black border rounded-xl p-6 transition-all ${
      isActive 
        ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)] ring-2 ring-green-500/30' 
        : 'border-zinc-800 hover:border-green-500/30'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white">{provider.name}</h3>
            <p className="text-xs text-zinc-400">{provider.type}</p>
          </div>
        </div>
        {isActive && (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
      </div>
      
      <p className="text-sm text-zinc-300 mb-4">{provider.description}</p>
      
      <div className="mb-4">
        <p className="text-xs font-semibold text-zinc-400 mb-2">Models</p>
        <div className="flex flex-wrap gap-1">
          {provider.models.map((model: string) => (
            <span key={model} className="text-[10px] px-2 py-1 bg-zinc-800/50 text-zinc-300 rounded font-mono">
              {model}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={provider.docs}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
        >
          Docs <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={onActivate}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            isActive 
              ? 'bg-green-600 text-white cursor-default' 
              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
          }`}
        >
          {isActive ? '✓ Active' : 'Use'}
        </button>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const { currentBrand } = useStore();
  const [activeTab, setActiveTab] = useState<'providers' | 'subscription' | 'usage'>('providers');
  const userId = 'user-123'; // Mock user ID

  return (
    <div className="h-full overflow-y-auto bg-black">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-zinc-800 p-6 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          {['providers', 'subscription', 'usage'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* PROVIDERS TAB */}
        {activeTab === 'providers' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Google Cloud AI Stack</h2>
              <p className="text-sm text-zinc-400 mb-6">
                All features powered by Google AI. One unified platform, unlimited potential.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.values(GOOGLE_PROVIDERS).map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    isActive={true}
                    onActivate={() => {}}
                  />
                ))}
              </div>
            </div>

            {/* Vertex AI Setup */}
            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/10 border border-blue-500/30 rounded-xl p-6">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-400" />
                Vertex AI Configuration
              </h3>
              <p className="text-sm text-zinc-300 mb-4">
                All Google services are integrated via Vertex AI. Configure your project in Google Cloud Console.
              </p>
              <a
                href="https://console.cloud.google.com/vertex-ai"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Open Vertex AI Console <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION TAB */}
        {activeTab === 'subscription' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Billing & Subscriptions</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Manage your plan, upgrade, and track usage.
              </p>
              
              {/* Tier Selector */}
              <TierSelector
                currentTier="pro"
                onUpgrade={(tier, cycle) => {
                  console.log(`Upgrading to ${tier} (${cycle})`);
                }}
              />
            </div>

            {/* Credits Wallet */}
            <div className="border-t border-zinc-800 pt-8">
              <h3 className="text-lg font-bold text-white mb-4">Credits & Usage</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <CreditsWallet
                    userId={userId}
                    onBuyCredits={() => {
                      console.log('Opening credit pack checkout');
                    }}
                  />
                </div>
                
                {/* Usage Stats */}
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-lg p-6">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-yellow-500" />
                    Usage Stats
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-400">Campaigns Created</p>
                      <p className="text-2xl font-bold text-white">24</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Videos Generated</p>
                      <p className="text-2xl font-bold text-white">18</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Jingles Created</p>
                      <p className="text-2xl font-bold text-white">8</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Lead Pitches</p>
                      <p className="text-2xl font-bold text-white">156</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing History */}
            <div className="border-t border-zinc-800 pt-8">
              <h3 className="text-lg font-bold text-white mb-4">Billing History</h3>
              <div className="space-y-3">
                {[
                  { date: 'Feb 27, 2025', amount: '$49.00', type: 'Pro Subscription' },
                  { date: 'Feb 20, 2025', amount: '$9.99', type: 'Credit Pack (1k)' },
                  { date: 'Feb 15, 2025', amount: '$0.00', type: 'Free Campaign' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.type}</p>
                      <p className="text-xs text-zinc-400">{item.date}</p>
                    </div>
                    <p className="text-sm font-bold text-white">{item.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* USAGE TAB */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">API Usage & Metrics</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Real-time usage across all Google AI services.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Gemini Calls', value: '3,240', icon: Cpu },
                { label: 'Images Generated', value: '1,250', icon: Palette },
                { label: 'Videos Created', value: '340', icon: Film },
                { label: 'Jingles Produced', value: '156', icon: Music }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-brand-500" />
                      <p className="text-xs text-zinc-400">{stat.label}</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Cost Analysis */}
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-500/30 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-400" />
                Cost Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-green-400 font-semibold">TOTAL SPENT</p>
                  <p className="text-3xl font-bold text-white">$247.50</p>
                  <p className="text-xs text-zinc-400 mt-1">This month</p>
                </div>
                <div>
                  <p className="text-xs text-green-400 font-semibold">AVERAGE COST</p>
                  <p className="text-3xl font-bold text-white">$0.05</p>
                  <p className="text-xs text-zinc-400 mt-1">Per operation</p>
                </div>
                <div>
                  <p className="text-xs text-green-400 font-semibold">ROI</p>
                  <p className="text-3xl font-bold text-white">24.8x</p>
                  <p className="text-xs text-zinc-400 mt-1">Revenue vs cost</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
