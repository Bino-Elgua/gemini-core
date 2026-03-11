/**
 * CreditsWallet Component
 * Shows balance, usage, and quick buy options
 */

import React, { useEffect, useState } from 'react';
import { firebaseService } from '../../services/firebaseService';
import { stripeService, CreditPack } from '../../services/stripeService';
import { pricingService } from '../../services/pricingService';
import { TrendingDown, Zap, ShoppingCart, AlertTriangle } from 'lucide-react';

interface CreditsWalletProps {
  userId: string;
  onBuyCredits?: () => void;
}

interface WalletData {
  balance: number;
  monthlyIncluded: number;
  monthlyUsed: number;
  spent24h: number;
  tier: string;
  nextRefill: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface UsageLogEntry {
  id: string;
  type: string;
  amount: number;
  timestamp: string;
  feature: string;
}

export const CreditsWallet: React.FC<CreditsWalletProps> = ({ userId, onBuyCredits }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [usageLog, setUsageLog] = useState<UsageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, [userId]);

  const loadWalletData = async () => {
    try {
      const user = await firebaseService.getUserProfile(userId);
      const balance = await firebaseService.getCreditsBalance(userId);
      
      const tierConfig = pricingService.getTierConfig(user.tier);
      
      const mockWallet: WalletData = {
        balance,
        monthlyIncluded: tierConfig.includedCredits,
        monthlyUsed: tierConfig.includedCredits - balance, // Placeholder
        spent24h: 150, // Placeholder
        tier: user.tier,
        nextRefill: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: balance < 100 ? 'critical' : balance < 500 ? 'warning' : 'healthy'
      };

      setWallet(mockWallet);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load wallet:', error);
      setLoading(false);
    }
  };

  if (loading || !wallet) {
    return <div className="text-zinc-500">Loading wallet...</div>;
  }

  const creditPacks = stripeService.getAvailableCreditPacks();
  const percentageUsed = Math.min(
    (wallet.monthlyUsed / wallet.monthlyIncluded) * 100,
    100
  );

  return (
    <div className="w-full max-w-md bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Credits Wallet
        </h3>
        <span className="text-xs px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full">
          {wallet.tier.toUpperCase()}
        </span>
      </div>

      {/* Balance */}
      <div className="mb-6">
        <div className="text-4xl font-bold text-white mb-2">
          {wallet.balance.toLocaleString()}
        </div>
        <p className="text-zinc-400 text-sm">Credits available</p>
        
        {wallet.status === 'critical' && (
          <div className="mt-3 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-300 text-xs flex items-gap-2">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            Running low. Buy more credits to continue.
          </div>
        )}
      </div>

      {/* Monthly Usage */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400 text-sm">Monthly Usage</span>
          <span className="text-xs text-zinc-500">
            {wallet.monthlyUsed} / {wallet.monthlyIncluded}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              wallet.status === 'critical'
                ? 'bg-red-600'
                : wallet.status === 'warning'
                ? 'bg-yellow-600'
                : 'bg-green-600'
            }`}
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-6 p-4 bg-zinc-800/30 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-300 font-semibold">Usage (24h)</span>
        </div>
        <div className="text-2xl font-bold text-white">
          -{wallet.spent24h}
        </div>
        <p className="text-xs text-zinc-500 mt-1">Credits used</p>
      </div>

      {/* Next Refill */}
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg">
        <p className="text-xs text-blue-300 mb-1">Next Refill</p>
        <p className="text-sm font-semibold text-white">
          {new Date(wallet.nextRefill).toLocaleDateString()} at 12:00 AM UTC
        </p>
        <p className="text-xs text-blue-300 mt-2">
          +{wallet.monthlyIncluded.toLocaleString()} credits
        </p>
      </div>

      {/* Quick Buy Credit Packs */}
      <div className="mb-6">
        <p className="text-sm text-zinc-300 font-semibold mb-3">Buy Credits</p>
        <div className="grid grid-cols-2 gap-2">
          {creditPacks.map((pack: CreditPack) => (
            <button
              key={pack.id}
              onClick={() => onBuyCredits?.()}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-left"
            >
              <div className="text-sm font-bold text-white">{pack.credits}</div>
              <div className="text-xs text-zinc-400">{stripeService.formatPrice(pack.priceInCents)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      <button className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
        <ShoppingCart className="w-4 h-4" />
        View All Packs
      </button>

      {/* Tier Info */}
      <div className="mt-6 pt-6 border-t border-zinc-800 text-xs text-zinc-500">
        <p className="mb-3">
          Current tier includes <span className="text-white font-semibold">{wallet.monthlyIncluded.toLocaleString()}</span> credits monthly.
        </p>
        <button className="text-blue-400 hover:text-blue-300 font-semibold">
          Upgrade Tier →
        </button>
      </div>
    </div>
  );
};

export default CreditsWallet;
