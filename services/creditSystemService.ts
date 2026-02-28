/**
 * Credit System Service
 * Manages: Subscription tiers, credit packs, daily limits, refunds on error
 */

export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';

interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  monthlyCredits: number;
  features: string[];
  agentLimit: number;
  teamSize: number;
}

interface CreditPack {
  name: string;
  credits: number;
  price: number;
}

interface UserCredits {
  tier: SubscriptionTier;
  totalCredits: number;
  usedToday: number;
  usedThisMonth: number;
  refundPending: number;
  nextResetDate: string;
}

class CreditSystemService {
  // Subscription plans
  readonly PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
    starter: {
      tier: 'starter',
      name: 'Starter (Free)',
      price: 0,
      monthlyCredits: 500, // Free daily = ~500/month
      features: [
        'Basic DNA extraction',
        'Manual campaign scheduling',
        'Email support',
        'Limited to 1 agent',
      ],
      agentLimit: 1,
      teamSize: 1,
    },
    pro: {
      tier: 'pro',
      name: 'Pro',
      price: 49,
      monthlyCredits: 2000,
      features: [
        'Advanced DNA extraction',
        'Auto-post campaigns (IG, TikTok)',
        'Real-time analytics',
        'Up to 5 agents',
        'Team collaboration (5 members)',
        'Priority email support',
      ],
      agentLimit: 5,
      teamSize: 5,
    },
    enterprise: {
      tier: 'enterprise',
      name: 'Enterprise',
      price: 199,
      monthlyCredits: 10000,
      features: [
        'Unlimited DNA extraction',
        'Full automation suite',
        'Advanced ML features',
        'Unlimited agents',
        'Team collaboration (50 members)',
        'Dedicated account manager',
        'Custom integrations',
      ],
      agentLimit: 999,
      teamSize: 50,
    },
  };

  // Credit packs for purchase
  readonly PACKS: CreditPack[] = [
    { name: 'Starter Pack', credits: 500, price: 4.99 },
    { name: 'Pro Pack', credits: 3000, price: 19.99 },
    { name: 'Enterprise Pack', credits: 10000, price: 59.99 },
  ];

  // Cost per operation (in credits)
  private operationCosts = {
    dnaExtraction: 50,
    campaignGeneration: 30,
    websiteGeneration: 100,
    agentChat: 10,
    autoPost: 50, // Only deducted on success
    scheduleCampaign: 5,
    liveSession: 1, // Per minute
  };

  // Daily limit for free tier (Starter)
  readonly FREE_DAILY_LIMIT = 500;

  /**
   * Get subscription plan details
   */
  getPlan(tier: SubscriptionTier): SubscriptionPlan {
    return this.PLANS[tier];
  }

  /**
   * Get all plans
   */
  getAllPlans(): SubscriptionPlan[] {
    return Object.values(this.PLANS);
  }

  /**
   * Get credit packs available for purchase
   */
  getAvailablePacks(): CreditPack[] {
    return this.PACKS;
  }

  /**
   * Calculate cost for operation
   */
  getCost(operation: keyof typeof this.operationCosts): number {
    return this.operationCosts[operation];
  }

  /**
   * Check if user has enough credits
   */
  hasEnoughCredits(userCredits: UserCredits, operation: keyof typeof this.operationCosts): boolean {
    const cost = this.getCost(operation);

    // Free tier: check daily limit
    if (userCredits.tier === 'starter') {
      return userCredits.usedToday + cost <= this.FREE_DAILY_LIMIT;
    }

    // Paid: check total monthly
    return userCredits.usedThisMonth + cost <= this.PLANS[userCredits.tier].monthlyCredits;
  }

  /**
   * Deduct credits (returns refund callback if failed)
   */
  deductCredits(
    userCredits: UserCredits,
    operation: keyof typeof this.operationCosts,
    options: { refundOnError?: boolean } = {}
  ): {
    success: boolean;
    newBalance: number;
    refundId?: string;
  } {
    const cost = this.getCost(operation);

    if (!this.hasEnoughCredits(userCredits, operation)) {
      return {
        success: false,
        newBalance: userCredits.totalCredits,
      };
    }

    const newBalance = userCredits.totalCredits - cost;

    return {
      success: true,
      newBalance,
      refundId: options.refundOnError ? `refund_${Date.now()}` : undefined,
    };
  }

  /**
   * Refund credits on error
   */
  refundCredits(userCredits: UserCredits, refundId: string, amount: number): UserCredits {
    return {
      ...userCredits,
      totalCredits: userCredits.totalCredits + amount,
      refundPending: Math.max(0, userCredits.refundPending - amount),
    };
  }

  /**
   * Purchase credit pack
   */
  purchasePack(
    userCredits: UserCredits,
    packIndex: number
  ): { success: boolean; newCredits: UserCredits; message: string } {
    const pack = this.PACKS[packIndex];
    if (!pack) {
      return {
        success: false,
        newCredits: userCredits,
        message: 'Pack not found',
      };
    }

    return {
      success: true,
      newCredits: {
        ...userCredits,
        totalCredits: userCredits.totalCredits + pack.credits,
      },
      message: `✅ Added ${pack.credits} credits`,
    };
  }

  /**
   * Get next plan recommendation
   */
  getNextPlan(currentTier: SubscriptionTier): SubscriptionPlan | null {
    if (currentTier === 'starter') return this.PLANS['pro'];
    if (currentTier === 'pro') return this.PLANS['enterprise'];
    return null;
  }

  /**
   * Calculate savings of upgrade
   */
  calculateUpgradeSavings(
    currentUsagePerMonth: number,
    fromTier: SubscriptionTier,
    toTier: SubscriptionTier
  ): {
    currentMonthlyCost: number;
    upgradeMonthlyCost: number;
    savings: number;
    creditsAvailable: number;
  } {
    const fromPlan = this.PLANS[fromTier];
    const toPlan = this.PLANS[toTier];

    // Cost to buy additional credits at current tier
    const costPerCredit = (fromPlan.price || 1) / fromPlan.monthlyCredits;
    const currentMonthlyCost = currentUsagePerMonth * costPerCredit;

    // Cost at new tier
    const upgradeMonthlyCost = toPlan.price;

    return {
      currentMonthlyCost,
      upgradeMonthlyCost,
      savings: Math.max(0, currentMonthlyCost - upgradeMonthlyCost),
      creditsAvailable: toPlan.monthlyCredits,
    };
  }

  /**
   * Format credits display
   */
  formatCredits(credits: number): string {
    if (credits >= 1000) {
      return `${(credits / 1000).toFixed(1)}k`;
    }
    return `${credits}`;
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(userCredits: UserCredits): number {
    const plan = this.PLANS[userCredits.tier];
    const usage =
      userCredits.tier === 'starter' ? userCredits.usedToday : userCredits.usedThisMonth;
    const limit = userCredits.tier === 'starter' ? this.FREE_DAILY_LIMIT : plan.monthlyCredits;

    return Math.min(100, (usage / limit) * 100);
  }

  /**
   * Calculate reset time
   */
  getResetTime(tier: SubscriptionTier): Date {
    const now = new Date();
    if (tier === 'starter') {
      // Daily reset (next midnight)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    // Monthly reset (next month, same day)
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  }
}

export const creditSystemService = new CreditSystemService();
