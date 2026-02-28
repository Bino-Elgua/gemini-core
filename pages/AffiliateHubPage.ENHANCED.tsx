import React, { useState } from 'react';
import { Users, Link2, TrendingUp, Award, Copy, ExternalLink, DollarSign, ShoppingCart, Target, BarChart3, Star, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const AffiliateHubPage = () => {
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'partners' | 'campaigns' | 'payouts'>('overview');

  const affiliateCode = 'SACRED-2025-PRO';
  const commissionRate = 30;
  const totalEarnings = 12450.50;
  const monthlyEarnings = 3890.25;
  const activePartners = 47;
  const clicksThisMonth = 15420;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-black">
      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-zinc-800 p-6 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-brand-500" />
            <h1 className="text-3xl font-bold text-white">Partner Hub</h1>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2">
            {['overview', 'partners', 'campaigns', 'payouts'].map((tab) => (
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
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Total Earnings</p>
                    <p className="text-4xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
                    <p className="text-xs text-green-400 mt-2">All time</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/10 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">This Month</p>
                    <p className="text-4xl font-bold text-white">${monthlyEarnings.toFixed(2)}</p>
                    <p className="text-xs text-blue-400 mt-2">+24% vs last month</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/10 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">Active Partners</p>
                    <p className="text-4xl font-bold text-white">{activePartners}</p>
                    <p className="text-xs text-purple-400 mt-2">+8 this month</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/10 border border-orange-500/30 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2">Clicks</p>
                    <p className="text-4xl font-bold text-white">{clicksThisMonth.toLocaleString()}</p>
                    <p className="text-xs text-orange-400 mt-2">This month</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Your Affiliate Code */}
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Link2 className="w-6 h-6 text-brand-500" />
                Your Affiliate Code
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Code</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-black border border-zinc-800 rounded-lg font-mono text-white font-bold">
                      {affiliateCode}
                    </div>
                    <button
                      onClick={() => copyToClipboard(affiliateCode, 'code')}
                      className="px-4 py-3 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 rounded-lg transition-colors"
                    >
                      {copied === 'code' ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">Commission Rate</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-black border border-zinc-800 rounded-lg font-bold text-white">
                      {commissionRate}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-zinc-400 uppercase">Shareable Links</label>
                {[
                  { label: 'Pro Tier ($49/mo)', url: `https://sacred.ai/?ref=${affiliateCode}&plan=pro` },
                  { label: 'Enterprise Tier ($199/mo)', url: `https://sacred.ai/?ref=${affiliateCode}&plan=enterprise` },
                  { label: 'Credit Pack ($9.99)', url: `https://sacred.ai/?ref=${affiliateCode}&product=pack-1k` }
                ].map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={link.url}
                      className="flex-1 px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-300 font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(link.url, `link-${i}`)}
                      className="px-3 py-2 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 rounded-lg transition-colors"
                    >
                      {copied === `link-${i}` ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission Structure */}
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                Commission Structure
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { plan: 'Pro Tier', price: '$49/mo', commission: '$14.70', rate: '30%' },
                  { plan: 'Enterprise Tier', price: '$199/mo', commission: '$59.70', rate: '30%' },
                  { plan: 'Credit Packs', price: '$4.99-$89.99', commission: '30%', rate: 'Variable' }
                ].map((item, i) => (
                  <div key={i} className="bg-black border border-zinc-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-white mb-3">{item.plan}</p>
                    <div className="space-y-2 text-xs text-zinc-400">
                      <p>Price: <span className="text-white font-bold">{item.price}</span></p>
                      <p>Commission: <span className="text-green-400 font-bold">{item.commission}</span></p>
                      <p>Rate: <span className="text-brand-400 font-bold">{item.rate}</span></p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Bonuses available: Refer 5 partners in a month for a 5% boost to all commissions</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PARTNERS TAB */}
        {activeTab === 'partners' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Your Partners</h2>

              <div className="space-y-3">
                {[
                  { name: 'Digital Sorcery Inc', joined: '3 months ago', earnings: 2450.00, referrals: 12 },
                  { name: 'Future Studios', joined: '2 months ago', earnings: 1890.50, referrals: 8 },
                  { name: 'AI Labs Network', joined: '1 month ago', earnings: 890.25, referrals: 4 }
                ].map((partner, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-black border border-zinc-800 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{partner.name}</p>
                      <p className="text-xs text-zinc-500">Joined {partner.joined}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">${partner.earnings.toFixed(2)}</p>
                      <p className="text-xs text-zinc-500">{partner.referrals} referrals</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Active Campaigns</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Pro Launch', status: 'active', ctr: '8.2%', conversions: 24 },
                  { name: 'Enterprise Push', status: 'active', ctr: '6.5%', conversions: 12 },
                  { name: 'Holiday Credits', status: 'upcoming', ctr: '-', conversions: 0 }
                ].map((campaign, i) => (
                  <div key={i} className="bg-black border border-zinc-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-white">{campaign.name}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        campaign.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-zinc-500">CTR</p>
                        <p className="font-bold text-white">{campaign.ctr}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Conversions</p>
                        <p className="font-bold text-white">{campaign.conversions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAYOUTS TAB */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Payout History</h2>

              <div className="space-y-3">
                {[
                  { date: 'Feb 27, 2025', amount: 3890.25, status: 'completed', method: 'Bank Transfer' },
                  { date: 'Jan 27, 2025', amount: 2850.75, status: 'completed', method: 'Bank Transfer' },
                  { date: 'Dec 27, 2024', amount: 2240.00, status: 'completed', method: 'Bank Transfer' },
                  { date: 'Nov 27, 2024', amount: 1890.50, status: 'completed', method: 'Bank Transfer' }
                ].map((payout, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-black border border-zinc-800 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{payout.date}</p>
                      <p className="text-xs text-zinc-500">{payout.method}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400">${payout.amount.toFixed(2)}</p>
                      <p className="text-xs text-green-500 font-semibold">{payout.status}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-300">
                  Next payout scheduled for <strong>March 27, 2025</strong> ($3,890.25 estimated)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateHubPage;
