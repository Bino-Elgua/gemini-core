/**
 * TierSelector Component
 * Shows available subscription tiers with pricing and features
 */

import React, { useState } from 'react';
import { pricingService, TierConfig } from '../services/pricingService';
import { stripeService } from '../services/stripeService';
import { Check, X } from 'lucide-react';

interface TierSelectorProps {
  currentTier: string;
  onUpgrade: (tier: string, billingCycle: 'monthly' | 'annual') => void;
  isLoading?: boolean;
}

export const TierSelector: React.FC<TierSelectorProps> = ({ 
  currentTier, 
  onUpgrade, 
  isLoading = false 
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const tiers = pricingService.getAllTiers().filter(t => t.tier !== 'free');

  const features = [
    { key: 'dnaExtraction', label: 'DNA Extraction' },
    { key: 'textCampaigns', label: 'Text Campaigns' },
    { key: 'imageGeneration', label: 'Image Generation' },
    { key: 'videoGeneration', label: 'Video Generation' },
    { key: 'jingleGeneration', label: 'Jingle Generation' },
    { key: 'leadAgent', label: 'Lead Agent' },
    { key: 'customAgents', label: 'Custom Agents' },
    { key: 'realTimeAnalytics', label: 'Real-time Analytics' },
    { key: 'collaboration', label: 'Team Collaboration' },
    { key: 'apiAccess', label: 'API Access' },
    { key: 'prioritySupport', label: 'Priority Support' }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-8 bg-black">
      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-zinc-900 rounded-lg p-1 flex gap-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-brand-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-6 py-2 rounded font-semibold transition-all ${
              billingCycle === 'annual'
                ? 'bg-brand-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Annual
            <span className="ml-2 text-xs text-green-400 font-bold">Save 10%</span>
          </button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {tiers.map((tier) => {
          const price = stripeService.getSubscriptionPrice(
            tier.tier as 'pro' | 'enterprise',
            billingCycle
          );
          const isCurrent = currentTier === tier.tier;
          const isStarter = currentTier === 'starter';

          return (
            <div
              key={tier.tier}
              className={`border rounded-xl p-8 transition-all ${
                isCurrent
                  ? 'border-brand-600 bg-brand-600/10 ring-2 ring-brand-600'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
              }`}
            >
              {/* Header */}
              <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
              <p className="text-zinc-400 text-sm mb-4">{tier.includedCredits.toLocaleString()} credits/month</p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">
                  ${(price / 100).toFixed(2)}
                </span>
                <span className="text-zinc-400 ml-2">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                {billingCycle === 'annual' && (
                  <div className="text-xs text-green-400 mt-2">
                    Save ${Math.floor((tier.monthlyPrice * 12 - price) / 100)} annually
                  </div>
                )}
              </div>

              {/* CTA Button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 bg-zinc-800 text-zinc-400 rounded-lg font-semibold cursor-default mb-8"
                >
                  ✓ Current Plan
                </button>
              ) : (
                <button
                  onClick={() => onUpgrade(tier.tier, billingCycle)}
                  disabled={isLoading}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors mb-8 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Upgrade'}
                </button>
              )}

              {/* Features List */}
              <div className="space-y-3">
                {features.map((feature) => {
                  const hasFeature = tier.features[feature.key as keyof typeof tier.features];
                  return (
                    <div key={feature.key} className="flex items-center gap-3">
                      {hasFeature ? (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-zinc-700 flex-shrink-0" />
                      )}
                      <span className={hasFeature ? 'text-zinc-200' : 'text-zinc-600'}>
                        {feature.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-4 px-4 text-zinc-300 font-semibold">Feature</th>
              {tiers.map((tier) => (
                <th
                  key={tier.tier}
                  className={`text-center py-4 px-4 font-semibold ${
                    currentTier === tier.tier ? 'text-brand-500' : 'text-zinc-300'
                  }`}
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.key} className="border-b border-zinc-900">
                <td className="py-3 px-4 text-zinc-400">{feature.label}</td>
                {tiers.map((tier) => {
                  const hasFeature = tier.features[feature.key as keyof typeof tier.features];
                  return (
                    <td key={tier.tier} className="text-center py-3 px-4">
                      {hasFeature ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-zinc-700 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TierSelector;
