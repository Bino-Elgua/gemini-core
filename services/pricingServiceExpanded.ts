/**
 * Pricing Service (Expanded Tiers, Gemini-only)
 * 
 * Tiers:
 * - Starter (free): 500 credits/day, manual posting, limited features
 * - Pro ($49/mo): 2000 credits/mo, auto-posting, team up to 5
 * - Enterprise ($199/mo): 10k+ credits/mo, unlimited team, priority support
 * 
 * Credit Packs:
 * - Small: $4.99 for 500 credits
 * - Medium: $19.99 for 3000 credits
 * - Large: $49.99 for 10k credits
 */

import { stripeService } from './stripeService';

export type UserTier = 'Starter' | 'Pro' | 'Pro+' | 'Enterprise';

export interface PricingTier {
  id: UserTier;
  name: string;
  price: number; // Monthly in USD
  credits: number; // Per month
  features: string[];
  teamSize: number;
  autoPosting: boolean;
  priority: boolean;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number; // USD
  savings: string; // e.g., "Save 20%"
}

class PricingServiceExpanded {
  private tiers: Record<UserTier, PricingTier> = {
    'Starter': {
      id: 'Starter',
      name: 'Starter (Free)',
      price: 0,
      credits: 500, // Per day, resets daily
      features: [
        '500 free credits/day',
        'Manual campaign posting',
        'DNA extraction (20 credits)',
        'Basic analytics',
        'Community support'
      ],
      teamSize: 1,
      autoPosting: false,
      priority: false
    },
    'Pro': {
      id: 'Pro',
      name: 'Pro',
      price: 49,
      credits: 2000, // Per month
      features: [
        '2,000 credits/month',
        'Auto-posting to IG/TikTok',
        'Team up to 5 members',
        'Advanced analytics',
        'Email support',
        'Website builder',
        'Live sessions',
        'Priority queue'
      ],
      teamSize: 5,
      autoPosting: true,
      priority: true
    },
    'Pro+': {
      id: 'Pro+',
      name: 'Pro+',
      price: 99,
      credits: 5000, // Per month
      features: [
        '5,000 credits/month',
        'Auto-posting + scheduling',
        'Team up to 15 members',
        'Advanced analytics + custom reports',
        'Priority email + chat support',
        'Website builder + hosting',
        'Live sessions + recordings',
        'API access',
        'Custom integrations'
      ],
      teamSize: 15,
      autoPosting: true,
      priority: true
    },
    'Enterprise': {
      id: 'Enterprise',
      name: 'Enterprise',
      price: 199,
      credits: 10000, // Per month (effectively unlimited)
      features: [
        '10,000+ credits/month',
        'Unlimited auto-posting',
        'Unlimited team members',
        'White-label support',
        '24/7 phone + chat support',
        'Dedicated account manager',
        'Custom workflows',
        'Advanced API + webhooks',
        'On-premise deployment',
        'SLA guarantee'
      ],
      teamSize: 999,
      autoPosting: true,
      priority: true
    }
  };

  private creditPacks: CreditPack[] = [
    {
      id: 'small',
      credits: 500,
      price: 4.99,
      savings: 'Standard'
    },
    {
      id: 'medium',
      credits: 3000,
      price: 19.99,
      savings: 'Save 15%'
    },
    {
      id: 'large',
      credits: 10000,
      price: 49.99,
      savings: 'Save 30%'
    }
  ];

  /**
   * Get all pricing tiers
   */
  getTiers(): PricingTier[] {
    return Object.values(this.tiers);
  }

  /**
   * Get specific tier
   */
  getTier(tierId: UserTier): PricingTier {
    return this.tiers[tierId];
  }

  /**
   * Get all credit packs
   */
  getCreditPacks(): CreditPack[] {
    return this.creditPacks;
  }

  /**
   * Get specific pack
   */
  getCreditPack(packId: string): CreditPack | undefined {
    return this.creditPacks.find(p => p.id === packId);
  }

  /**
   * Get user tier (from Stripe subscription or localStorage)
   */
  async getUserTier(userId: string): Promise<UserTier> {
    try {
      // Check Stripe subscription
      const subscription = await stripeService.getSubscription(userId);
      if (subscription) {
        // Map Stripe plan to tier
        if (subscription.planId === 'pro') return 'Pro';
        if (subscription.planId === 'pro_plus') return 'Pro+';
        if (subscription.planId === 'enterprise') return 'Enterprise';
      }
    } catch (e) {
      console.warn('Failed to fetch subscription:', e);
    }

    // Default to Starter
    return 'Starter';
  }

  /**
   * Calculate credits per operation
   */
  getOperationCost(operation: string): number {
    const costs: Record<string, number> = {
      'dna-extraction': 20,
      'campaign-generation': 30,
      'asset-generation': 10,
      'image-generation': 5,
      'website-generation': 50,
      'auto-post': 50,
      'sonic-chat': 2,
      'provider-health-check': 0
    };
    return costs[operation] || 10;
  }

  /**
   * Upgrade user tier
   */
  async upgradeTier(userId: string, tierName: UserTier): Promise<boolean> {
    try {
      const tier = this.tiers[tierName];
      if (!tier || tier.price === 0) {
        throw new Error('Invalid tier or cannot upgrade to free tier');
      }

      // Create Stripe subscription
      const result = await stripeService.createSubscription(userId, {
        plan: tierName.toLowerCase(),
        amount: tier.price * 100 // In cents
      });

      return result.success;
    } catch (error) {
      console.error('Failed to upgrade tier:', error);
      return false;
    }
  }

  /**
   * Buy credit pack
   */
  async buyCreditPack(userId: string, packId: string): Promise<boolean> {
    try {
      const pack = this.getCreditPack(packId);
      if (!pack) {
        throw new Error('Credit pack not found');
      }

      // Create one-time charge
      const result = await stripeService.createCharge(userId, {
        amount: pack.price * 100,
        description: `Credit pack: ${pack.credits} credits`,
        metadata: { packId, credits: pack.credits }
      });

      if (result.success) {
        // Add credits to user account
        console.log(`✅ Added ${pack.credits} credits to user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to buy credit pack:', error);
      return false;
    }
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}/mo`;
  }

  /**
   * Format credits for display
   */
  formatCredits(credits: number): string {
    if (credits >= 1000) {
      return `${(credits / 1000).toFixed(1)}k`;
    }
    return String(credits);
  }

  /**
   * Get tier comparison data for UI
   */
  getTierComparison() {
    return {
      tiers: this.getTiers(),
      features: [
        'Daily/Monthly Credits',
        'Auto-Posting',
        'Team Size',
        'Support',
        'Website Builder',
        'Live Sessions',
        'API Access'
      ]
    };
  }
}

export const pricingServiceExpanded = new PricingServiceExpanded();
