/**
 * Auth Service Extensions - Tier Gating & Feature Access
 * Wrap existing auth logic with tier/credit checks
 */

import { firebaseService } from './firebaseService';
import { pricingService, Tier } from './pricingService';

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  suggestedAction?: {
    type: 'upgrade' | 'buy-credits' | 'contact-sales';
    tier?: string;
    cost?: number;
  };
}

class AuthServiceTierExtensions {
  
  /**
   * Check if user can access a feature
   */
  async canAccessFeature(userId: string, feature: string): Promise<FeatureAccessResult> {
    const user = await firebaseService.getUserProfile(userId);
    
    if (!user) {
      return {
        allowed: false,
        reason: 'User profile not found'
      };
    }

    const tier = (user.tier || 'free') as any;
    const config = pricingService.getTierConfig(tier);

    // Map feature requests to tier features
    const featureMap: Record<string, keyof typeof config.features> = {
      'video-generation': 'videoGeneration',
      'image-generation': 'imageGeneration',
      'jingle-generation': 'jingleGeneration',
      'lead-agent': 'leadAgent',
      'custom-agents': 'customAgents',
      'api-access': 'apiAccess',
      'priority-support': 'prioritySupport',
      'unlimited-videos': 'unlimitedVideos',
      'real-time-analytics': 'realTimeAnalytics',
      'collaboration': 'collaboration'
    };

    const tieredFeature = featureMap[feature];
    if (!tieredFeature) {
      return { allowed: true }; // Feature not tiered
    }

    const hasFeature = config.features[tieredFeature];
    if (!hasFeature) {
      const prompt = pricingService.getUpgradePrompt(tier as any, feature);
      return {
        allowed: false,
        reason: prompt?.message || `"${feature}" is not available on ${tier} tier`,
        suggestedAction: prompt ? {
          type: 'upgrade',
          tier: prompt.suggestedTier
        } : {
          type: 'contact-sales'
        }
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user has enough credits for operation
   */
  async canAffordOperation(userId: string, operation: string): Promise<FeatureAccessResult> {
    const balance = await firebaseService.getCreditsBalance(userId);

    // Get cost for this operation (might vary by tier)
    const { creditsService } = await import('./creditsService');
    const cost = creditsService.getOperationCost(operation);

    if (balance < cost) {
      return {
        allowed: false,
        reason: `Insufficient credits. Need ${cost}, have ${balance}.`,
        suggestedAction: {
          type: 'buy-credits',
          cost
        }
      };
    }

    return { allowed: true };
  }

  /**
   * Get complete access check (feature + credits)
   */
  async checkFeatureAccess(
    userId: string,
    feature: string,
    operation?: string
  ): Promise<FeatureAccessResult> {
    // Check feature tier access
    const featureCheck = await this.canAccessFeature(userId, feature);
    if (!featureCheck.allowed) {
      return featureCheck;
    }

    // If operation provided, check credits
    if (operation) {
      const creditCheck = await this.canAffordOperation(userId, operation);
      if (!creditCheck.allowed) {
        return creditCheck;
      }
    }

    return { allowed: true };
  }

  /**
   * Get feature access with user-friendly message
   */
  async getAccessMessage(userId: string, feature: string): Promise<{
    allowed: boolean;
    title: string;
    message: string;
    cta?: {
      label: string;
      action: string;
    };
  }> {
    const result = await this.canAccessFeature(userId, feature);

    if (result.allowed) {
      return {
        allowed: true,
        title: '✅ Access Granted',
        message: `You can now use ${feature}.`
      };
    }

    const suggestedTier = result.suggestedAction?.tier;
    const tierConfig = suggestedTier ? pricingService.getTierConfig(suggestedTier as any) : null;
    const price = tierConfig ? `$${(tierConfig.monthlyPrice / 100).toFixed(2)}/month` : 'contact us';

    return {
      allowed: false,
      title: '🔒 Feature Locked',
      message: result.reason || `This feature is not available on your tier.`,
      cta: result.suggestedAction ? {
        label: result.suggestedAction.type === 'upgrade' 
          ? `Upgrade to ${suggestedTier} (${price})` 
          : `Buy Credits`,
        action: result.suggestedAction.type
      } : undefined
    };
  }

  /**
   * Enforce access (throw if not allowed)
   */
  async enforceFeatureAccess(userId: string, feature: string, operation?: string): Promise<void> {
    const result = await this.checkFeatureAccess(userId, feature, operation);
    
    if (!result.allowed) {
      throw new Error(result.reason || 'Access denied');
    }
  }

  /**
   * Get user's effective tier after checking subscription status
   */
  async getEffectiveTier(userId: string): Promise<string> {
    const user = await firebaseService.getUserProfile(userId);
    
    // If subscription expired, downgrade to starter
    if (user?.subscriptionStatus === 'canceled' || user?.subscriptionStatus === 'expired') {
      return 'starter';
    }

    return user?.tier || 'free';
  }

  /**
   * Check if subscription renewal is upcoming (warn at 7 days)
   */
  async getSubscriptionStatus(userId: string): Promise<{
    tier: string;
    status: string;
    nextBillingDate?: string;
    daysUntilRenewal?: number;
    warningActive?: boolean;
  }> {
    const user = await firebaseService.getUserProfile(userId);
    const tier = (await this.getEffectiveTier(userId)) as any;

    if (!user?.nextBillingDate) {
      return {
        tier,
        status: 'no-subscription'
      } as any;
    }

    const nextBilling = new Date(user.nextBillingDate);
    const now = new Date();
    const daysUntil = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      tier,
      status: user.subscriptionStatus || 'unknown',
      nextBillingDate: user.nextBillingDate,
      daysUntilRenewal: daysUntil,
      warningActive: daysUntil <= 7 && daysUntil > 0
    } as any;
  }
}

export const authServiceTierGating = new AuthServiceTierExtensions();
