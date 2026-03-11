/**
 * Pricing Service - Tier Logic & Feature Gating
 * Hybrid model: Subscriptions + usage-based credits
 */

export type Tier = 'starter' | 'pro' | 'enterprise' | 'free';

export interface TierConfig {
  tier: Tier;
  name: string;
  monthlyPrice: number; // in USD cents
  includedCredits: number; // per month
  creditOveragePrice: number; // per credit (cents)
  resetDay: number; // day of month (1-28)
  features: {
    dnaExtraction: boolean; // 20 credits
    textCampaigns: boolean; // 50 credits
    imageGeneration: boolean; // 40 credits
    videoGeneration: boolean; // 200 credits
    jingleGeneration: boolean; // 60 credits
    leadAgent: boolean; // 25 credits per pitch
    customAgents: boolean; // +$0.02/outcome
    unlimitedVideos: boolean; // if video enabled
    realTimeAnalytics: boolean;
    collaboration: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

export interface UserTierData {
  tier: Tier;
  subscriptionStatus: 'active' | 'canceled' | 'expired';
  subscriptionId?: string; // Stripe subscription ID
  nextBillingDate?: string;
  creditsBalance: number;
  creditsIncludedThisMonth: number;
  creditsUsedThisMonth: number;
  monthlyResetDay: number;
  annualDiscount: boolean; // 10% off if annual
  createdAt: string;
  updatedAt: string;
}

class PricingService {
  private tiers: Map<Tier, TierConfig> = new Map([
    [
      'free',
      {
        tier: 'free',
        name: 'Free',
        monthlyPrice: 0,
        includedCredits: 0,
        creditOveragePrice: 0,
        resetDay: 1,
        features: {
          dnaExtraction: true,
          textCampaigns: true,
          imageGeneration: false,
          videoGeneration: false,
          jingleGeneration: false,
          leadAgent: false,
          customAgents: false,
          unlimitedVideos: false,
          realTimeAnalytics: false,
          collaboration: false,
          apiAccess: false,
          prioritySupport: false
        }
      }
    ],
    [
      'starter',
      {
        tier: 'starter',
        name: 'Starter',
        monthlyPrice: 0, // Can buy credits, but no subscription
        includedCredits: 500, // Purchased via credit packs
        creditOveragePrice: 1, // $0.01 per credit
        resetDay: 1,
        features: {
          dnaExtraction: true,
          textCampaigns: true,
          imageGeneration: false,
          videoGeneration: false,
          jingleGeneration: false,
          leadAgent: false,
          customAgents: false,
          unlimitedVideos: false,
          realTimeAnalytics: false,
          collaboration: false,
          apiAccess: false,
          prioritySupport: false
        }
      }
    ],
    [
      'pro',
      {
        tier: 'pro',
        name: 'Pro',
        monthlyPrice: 4900, // $49/month
        includedCredits: 2000, // 2k credits/month
        creditOveragePrice: 1, // $0.01 per credit
        resetDay: 1,
        features: {
          dnaExtraction: true,
          textCampaigns: true,
          imageGeneration: true,
          videoGeneration: true,
          jingleGeneration: false, // Requires upgrade
          leadAgent: true,
          customAgents: false,
          unlimitedVideos: false,
          realTimeAnalytics: true,
          collaboration: true,
          apiAccess: false,
          prioritySupport: false
        }
      }
    ],
    [
      'enterprise',
      {
        tier: 'enterprise',
        name: 'Enterprise',
        monthlyPrice: 19900, // $199/month
        includedCredits: 10000, // 10k credits/month
        creditOveragePrice: 1, // $0.01 per credit
        resetDay: 1,
        features: {
          dnaExtraction: true,
          textCampaigns: true,
          imageGeneration: true,
          videoGeneration: true,
          jingleGeneration: true,
          leadAgent: true,
          customAgents: true,
          unlimitedVideos: true, // Discounted: 150 credits instead of 200
          realTimeAnalytics: true,
          collaboration: true,
          apiAccess: true,
          prioritySupport: true
        }
      }
    ]
  ]);

  private operationCosts: Record<string, number> = {
    'dna-extraction': 20,
    'text-campaign': 50,
    'image-generation': 40,
    'video-generation': 200, // Enterprise: 150
    'jingle-generation': 60,
    'lead-agent-pitch': 25,
    'custom-agent-outcome': 200 // $2 outcome-based
  };

  getTierConfig(tier: Tier): TierConfig {
    return this.tiers.get(tier) || this.tiers.get('free')!;
  }

  getAllTiers(): TierConfig[] {
    return Array.from(this.tiers.values());
  }

  async getUserTier(userId: string): Promise<UserTierData> {
    return {
      tier: 'pro',
      subscriptionStatus: 'active',
      subscriptionId: 'sub_mock_123',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      creditsBalance: 500,
      creditsIncludedThisMonth: 2000,
      creditsUsedThisMonth: 1500,
      monthlyResetDay: 1,
      annualDiscount: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  canAccessFeature(tier: Tier, feature: keyof TierConfig['features']): boolean {
    const config = this.getTierConfig(tier);
    return config.features[feature] ?? false;
  }

  getOperationCost(operation: string, tier: Tier): number {
    const baseCost = this.operationCosts[operation] || 50;
    
    // Enterprise gets discounts on videos & jingles
    if (tier === 'enterprise') {
      if (operation === 'video-generation') return 150;
      if (operation === 'jingle-generation') return 50;
    }
    
    return baseCost;
  }

  calculateMonthlyBreakdown(tier: Tier, creditsUsed: number, annualBilling: boolean = false): {
    basePrice: number;
    includedCredits: number;
    overageCredits: number;
    overagePrice: number;
    annualDiscount: number;
    totalPrice: number;
  } {
    const config = this.getTierConfig(tier);
    const basePrice = config.monthlyPrice;
    const includedCredits = config.includedCredits;
    
    const overageCredits = Math.max(0, creditsUsed - includedCredits);
    const overagePrice = overageCredits * config.creditOveragePrice;
    
    const subtotal = basePrice + overagePrice;
    const annualDiscount = annualBilling ? Math.floor(subtotal * 0.1) : 0; // 10% annual discount
    const totalPrice = subtotal - annualDiscount;

    return {
      basePrice,
      includedCredits,
      overageCredits,
      overagePrice,
      annualDiscount,
      totalPrice
    };
  }

  // Feature upgrade prompts
  getUpgradePrompt(tier: Tier, requestedFeature: string): {
    required: Tier[];
    message: string;
    suggestedTier: Tier;
  } | null {
    const prompts: Record<string, { required: Tier[]; suggestedTier: Tier }> = {
      'video-generation': { required: ['pro', 'enterprise'], suggestedTier: 'pro' },
      'image-generation': { required: ['pro', 'enterprise'], suggestedTier: 'pro' },
      'jingle-generation': { required: ['enterprise'], suggestedTier: 'enterprise' },
      'lead-agent': { required: ['pro', 'enterprise'], suggestedTier: 'pro' },
      'custom-agents': { required: ['enterprise'], suggestedTier: 'enterprise' },
      'api-access': { required: ['enterprise'], suggestedTier: 'enterprise' }
    };

    const prompt = prompts[requestedFeature];
    if (!prompt) return null;

    if (prompt.required.includes(tier)) {
      return null; // Already has access
    }

    const suggestedConfig = this.getTierConfig(prompt.suggestedTier);
    return {
      required: prompt.required,
      message: `"${requestedFeature}" is only available on ${prompt.suggestedTier} ($${(suggestedConfig.monthlyPrice / 100).toFixed(2)}/mo or higher). Upgrade now?`,
      suggestedTier: prompt.suggestedTier
    };
  }

  getOperationLabel(operation: string): string {
    const labels: Record<string, string> = {
      'dna-extraction': 'DNA Extraction',
      'text-campaign': 'Text Campaign',
      'image-generation': 'Image Generation',
      'video-generation': 'Video Generation',
      'jingle-generation': 'Jingle Generation',
      'lead-agent-pitch': 'Lead Agent Pitch',
      'custom-agent-outcome': 'Custom Agent Outcome'
    };
    return labels[operation] || operation;
  }

  // Calculate runway
  calculateRunway(
    creditsBalance: number,
    avgCreditsPerDay: number,
    tier: Tier
  ): {
    daysRemaining: number;
    nextRefillDate: string;
    status: 'healthy' | 'warning' | 'critical';
  } {
    const config = this.getTierConfig(tier);
    const monthlyIncluded = config.includedCredits;
    const today = new Date();
    const nextRefillDate = new Date(today.getFullYear(), today.getMonth() + 1, config.resetDay);

    const daysUntilRefill = Math.ceil(
      (nextRefillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysCanAfford = avgCreditsPerDay > 0 
      ? Math.floor(creditsBalance / avgCreditsPerDay) 
      : 999;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (daysCanAfford < 3) status = 'critical';
    else if (daysCanAfford < 7) status = 'warning';

    return {
      daysRemaining: daysCanAfford,
      nextRefillDate: nextRefillDate.toISOString(),
      status
    };
  }
}

export const pricingService = new PricingService();
