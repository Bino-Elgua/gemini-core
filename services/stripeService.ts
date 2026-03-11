/**
 * Stripe Service - Payment Processing
 * Handles subscriptions, credit packs, and overage billing
 */

import { firebaseService } from './firebaseService';
import { creditsService } from './creditsService';
import { pricingService, Tier } from './pricingService';

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
  type: 'subscription' | 'credit-pack' | 'upgrade';
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceInCents: number;
  stripePriceId: string;
}

class StripeService {
  private stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  private stripeSecretKey = import.meta.env.VITE_STRIPE_SECRET_KEY;

  // Credit packs (self-service)
  private creditPacks: CreditPack[] = [
    {
      id: 'pack-small',
      name: '500 Credits',
      credits: 500,
      priceInCents: 499, // $4.99
      stripePriceId: 'price_starter_500'
    },
    {
      id: 'pack-medium',
      name: '1000 Credits',
      credits: 1000,
      priceInCents: 999, // $9.99
      stripePriceId: 'price_starter_1000'
    },
    {
      id: 'pack-large',
      name: '5000 Credits',
      credits: 5000,
      priceInCents: 4499, // $44.99
      stripePriceId: 'price_starter_5000'
    },
    {
      id: 'pack-xlarge',
      name: '10000 Credits',
      credits: 10000,
      priceInCents: 8999, // $89.99
      stripePriceId: 'price_starter_10000'
    }
  ];

  // Subscription tiers (mapped to Stripe price IDs)
  private subscriptionTiers = {
    pro: {
      name: 'Pro',
      price: 4900, // $49/month
      stripePriceId: 'price_pro_monthly',
      stripePriceIdAnnual: 'price_pro_annual' // $490/year (10% discount)
    },
    enterprise: {
      name: 'Enterprise',
      price: 19900, // $199/month
      stripePriceId: 'price_enterprise_monthly',
      stripePriceIdAnnual: 'price_enterprise_annual' // $1990/year (10% discount)
    }
  };

  // ===== SUBSCRIPTION CHECKOUT =====

  async createSubscriptionCheckout(
    userId: string,
    tier: 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<StripeCheckoutSession> {
    console.log(`💳 Creating ${tier} subscription checkout for ${userId}...`);

    const tierConfig = this.subscriptionTiers[tier];
    const priceId = billingCycle === 'annual' 
      ? tierConfig.stripePriceIdAnnual 
      : tierConfig.stripePriceId;

    // In production, call Stripe API
    // For now, return mock session
    const sessionId = `cs_${Date.now()}`;
    const url = `https://checkout.stripe.com/pay/${sessionId}`;

    // Log intent in Firebase
    await firebaseService.logEvent(userId, 'subscription-checkout-started', {
      tier,
      billingCycle,
      priceId,
      price: billingCycle === 'annual' 
        ? Math.floor(tierConfig.price * 0.9) 
        : tierConfig.price
    });

    return {
      sessionId,
      url,
      type: 'subscription'
    };
  }

  // ===== CREDIT PACK CHECKOUT =====

  async createCreditPackCheckout(userId: string, packId: string): Promise<StripeCheckoutSession> {
    const pack = this.creditPacks.find(p => p.id === packId);
    if (!pack) {
      throw new Error(`Credit pack not found: ${packId}`);
    }

    console.log(`💳 Creating credit pack checkout: ${pack.name}`);

    const sessionId = `cs_${Date.now()}`;
    const url = `https://checkout.stripe.com/pay/${sessionId}`;

    await firebaseService.logEvent(userId, 'credit-pack-checkout-started', {
      packId,
      credits: pack.credits,
      price: pack.priceInCents
    });

    return {
      sessionId,
      url,
      type: 'credit-pack'
    };
  }

  // ===== UPGRADE CHECKOUT =====

  async createUpgradeCheckout(
    userId: string,
    currentTier: Tier,
    upgradeTier: 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<StripeCheckoutSession> {
    console.log(`💳 Creating upgrade from ${currentTier} to ${upgradeTier}...`);

    // Calculate prorated amount
    const tierConfig = this.subscriptionTiers[upgradeTier];
    const proratedPrice = this.calculateProration(tierConfig.price, currentTier, upgradeTier);

    const sessionId = `cs_${Date.now()}`;
    const url = `https://checkout.stripe.com/pay/${sessionId}`;

    await firebaseService.logEvent(userId, 'upgrade-checkout-started', {
      fromTier: currentTier,
      toTier: upgradeTier,
      proratedPrice
    });

    return {
      sessionId,
      url,
      type: 'upgrade'
    };
  }

  async getSubscription(userId: string): Promise<any> {
    return {
      id: 'sub_mock_123',
      status: 'active',
      tier: 'pro',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    };
  }

  async createSubscription(userId: string, tier: string | { plan: string; amount: number }): Promise<any> {
    const tierName = typeof tier === 'string' ? tier : tier.plan;
    return {
      id: 'sub_mock_' + Date.now(),
      status: 'active',
      tier: tierName
    };
  }

  async createCharge(userId: string, amount: number, description: string): Promise<any> {
    console.log(`💳 Mock charge created for ${userId}: ${amount} - ${description}`);
    return {
      id: 'ch_mock_' + Date.now(),
      status: 'succeeded',
      amount,
      description
    };
  }

  private calculateProration(newPrice: number, currentTier: Tier, upgradeTier: string): number {
    // Simple proation: charge difference for remainder of month
    // In production, calculate based on billing period
    const daysRemaining = 30; // placeholder
    return Math.floor((newPrice / 30) * daysRemaining);
  }

  // ===== WEBHOOK HANDLERS (Firebase Functions) =====

  async handleSubscriptionCreated(
    userId: string,
    tier: 'pro' | 'enterprise',
    subscriptionId: string,
    billingCycle: 'monthly' | 'annual'
  ): Promise<void> {
    console.log(`✅ Subscription created: ${subscriptionId}`);

    // Add credits to user account
    const tierConfig = pricingService.getTierConfig(tier);
    await firebaseService.addCredits(userId, tierConfig.includedCredits, `subscription-${tier}-${billingCycle}`);

    // Update user tier in Firebase
    const nextBillingDate = new Date();
    if (billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    await firebaseService.updateUser(userId, {
      tier,
      subscriptionStatus: 'active',
      subscriptionId,
      nextBillingDate: nextBillingDate.toISOString(),
      billingCycle,
      annualDiscount: billingCycle === 'annual'
    });

    await firebaseService.logEvent(userId, 'subscription-created', {
      tier,
      subscriptionId,
      billingCycle,
      creditsGranted: tierConfig.includedCredits
    });
  }

  async handleSubscriptionRenewed(userId: string, subscriptionId: string, tier: 'pro' | 'enterprise'): Promise<void> {
    console.log(`✅ Subscription renewed: ${subscriptionId}`);

    // Reset monthly credits
    const tierConfig = pricingService.getTierConfig(tier);
    await firebaseService.addCredits(userId, tierConfig.includedCredits, `subscription-renewal-${tier}`);
    
    // Update billing date
    const nextBillingDate = new Date();
    const user = await firebaseService.getUserProfile(userId);
    const billingCycle = user?.billingCycle || 'monthly';

    if (billingCycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    await firebaseService.updateUser(userId, {
      nextBillingDate: nextBillingDate.toISOString()
    });

    await firebaseService.logEvent(userId, 'subscription-renewed', {
      tier,
      creditsGranted: tierConfig.includedCredits
    });
  }

  async handleSubscriptionCanceled(userId: string, subscriptionId: string): Promise<void> {
    console.log(`❌ Subscription canceled: ${subscriptionId}`);

    await firebaseService.updateUser(userId, {
      tier: 'starter', // Downgrade to starter (can still buy packs)
      subscriptionStatus: 'canceled',
      subscriptionId: undefined
    });

    await firebaseService.logEvent(userId, 'subscription-canceled', {
      subscriptionId
    });
  }

  async handleCreditPackPurchased(userId: string, packId: string): Promise<void> {
    const pack = this.creditPacks.find(p => p.id === packId);
    if (!pack) return;

    console.log(`✅ Credit pack purchased: ${pack.name}`);

    // Add credits
    await firebaseService.addCredits(userId, pack.credits, `credit-pack-${packId}`);

    await firebaseService.logEvent(userId, 'credit-pack-purchased', {
      packId,
      credits: pack.credits,
      price: pack.priceInCents
    });
  }

  async handlePaymentFailed(userId: string, reason: string): Promise<void> {
    console.log(`❌ Payment failed for ${userId}: ${reason}`);

    await firebaseService.logEvent(userId, 'payment-failed', {
      reason
    });
  }

  // ===== HELPERS =====

  getAvailableCreditPacks(): CreditPack[] {
    return this.creditPacks;
  }

  getPack(packId: string): CreditPack | undefined {
    return this.creditPacks.find(p => p.id === packId);
  }

  getSubscriptionPrice(tier: 'pro' | 'enterprise', billingCycle: 'monthly' | 'annual' = 'monthly'): number {
    const config = this.subscriptionTiers[tier];
    if (billingCycle === 'annual') {
      return Math.floor(config.price * 0.9); // 10% discount
    }
    return config.price;
  }

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export const stripeService = new StripeService();
