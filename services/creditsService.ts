/**
 * Credits Service - Monetization & Cost Tracking
 * Users buy credit packs: $10 = 1000 credits
 * Each action deducts credits based on real Google costs + 50% markup
 */

import { firebaseService } from './firebaseService';

export interface CreditPack {
  id: string;
  credits: number;
  price: number; // in USD cents
  label: string;
}

export interface CostRecord {
  provider: 'google-gemini' | 'google-imagen' | 'google-veo' | 'google-lyria';
  model: string;
  operation: string; // 'dna-extraction', 'campaign-generation', 'image-generation', 'video-generation', 'jingle-generation'
  cost: number; // in USD
  metadata?: Record<string, any>;
}

// Available credit packs (predefined offerings)
const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack-small', credits: 500, price: 499, label: '500 credits ($4.99)' },
  { id: 'pack-medium', credits: 1000, price: 999, label: '1000 credits ($9.99)' },
  { id: 'pack-large', credits: 5000, price: 4499, label: '5000 credits ($44.99)' },
  { id: 'pack-xlarge', credits: 10000, price: 8999, label: '10000 credits ($89.99)' }
];

// Credit costs per operation (based on real Google costs + 50% markup)
const OPERATION_COSTS = {
  'dna-extraction': 20,      // Extracting DNA from URL (one LLM call, ~3k tokens)
  'campaign-prd': 50,        // Generating campaign strategy (one LLM call, ~8k tokens)
  'campaign-asset': 30,      // Single asset generation (copy + image prompt)
  'campaign-full': 100,      // Full campaign with 5 assets
  'image-generation': 40,    // One image via Imagen 3
  'video-generation': 200,   // One video via Veo 3 (expensive)
  'jingle-generation': 60,   // One jingle via Lyria 3
  'self-healing': 15,        // Content validation/repair
  'lead-synthesis': 25       // Lead generation synthesis via Gemini
};

class CreditsService {
  private costs: Map<string, CostRecord> = new Map();
  private userId: string = '';

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    console.log(`✅ Credits service initialized for user: ${userId}`);
  }

  // ===== SUBSCRIPTION CREDIT RESET =====

  async resetMonthlyCredits(userId: string, tier: string): Promise<number> {
    // Called monthly via Firebase Function at reset date
    const { pricingService } = await import('./pricingService');
    const config = pricingService.getTierConfig(tier as any);
    
    // Add monthly included credits
    return await firebaseService.addCredits(userId, config.includedCredits, `monthly-reset-${tier}`);
  }

  // ===== PRICING =====

  getAvailablePacks(): CreditPack[] {
    return CREDIT_PACKS;
  }

  getOperationCost(operation: string): number {
    return OPERATION_COSTS[operation as keyof typeof OPERATION_COSTS] || 50;
  }

  // ===== REAL-TIME COST TRACKING =====

  async logCost(record: CostRecord): Promise<void> {
    const costInUSD = record.cost;
    
    // Convert to credits: $0.01 = 10 credits (1000 credits = $1)
    // Plus 50% markup on actual cost
    const creditValue = 100; // 1 credit = $0.01
    const creditsToDeduct = Math.ceil((costInUSD * 1.5) * creditValue);

    console.log(`💰 ${record.operation}: $${costInUSD.toFixed(6)} (actual) → ${creditsToDeduct} credits (with 50% markup)`);

    // Store cost record
    const recordId = `${Date.now()}_${Math.random()}`;
    this.costs.set(recordId, record);

    // Log in Firebase
    await firebaseService.logEvent(this.userId, 'cost-logged', {
      provider: record.provider,
      model: record.model,
      operation: record.operation,
      costUSD: costInUSD,
      creditsDeducted: creditsToDeduct,
      metadata: record.metadata
    });
  }

  // ===== OPERATION CREDITS =====

  async deductOperationCredits(operation: string): Promise<boolean> {
    const cost = this.getOperationCost(operation);
    return await firebaseService.deductCredits(this.userId, cost, operation);
  }

  async canAffordOperation(operation: string): Promise<boolean> {
    const cost = this.getOperationCost(operation);
    const balance = await firebaseService.getCreditsBalance(this.userId);
    return balance >= cost;
  }

  // ===== BULK OPERATIONS =====

  async deductMultipleOperations(operations: string[]): Promise<{ success: boolean; totalCost: number; insufficient: boolean }> {
    const totalCost = operations.reduce((sum, op) => sum + this.getOperationCost(op), 0);
    const balance = await firebaseService.getCreditsBalance(this.userId);

    if (balance < totalCost) {
      return { success: false, totalCost, insufficient: true };
    }

    const deducted = await firebaseService.deductCredits(this.userId, totalCost, 'bulk-operations');
    return { success: deducted, totalCost, insufficient: false };
  }

  // ===== FREE TIER =====

  async grantFirstCampaignFree(): Promise<void> {
    // Mark user as having used their free campaign
    await firebaseService.updateUser(this.userId, { 
      firstCampaignUsed: true,
      firstCampaignAt: new Date().toISOString()
    });
  }

  async canClaimFirstCampaignFree(userId?: string): Promise<boolean> {
    const uid = userId || this.userId;
    const user = await firebaseService.getUserProfile(uid);
    return !user?.firstCampaignUsed;
  }

  // ===== REPORTING =====

  async getCostReport(timeframeHours: number = 24): Promise<{
    totalCost: number;
    byProvider: Record<string, number>;
    byOperation: Record<string, number>;
    count: number;
  }> {
    const cutoff = Date.now() - (timeframeHours * 60 * 60 * 1000);
    const recent = Array.from(this.costs.values()).filter(c => {
      // Assuming timestamps are embedded; for now, count all
      return true;
    });

    const byProvider: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    let totalCost = 0;

    recent.forEach(record => {
      totalCost += record.cost;
      byProvider[record.provider] = (byProvider[record.provider] || 0) + record.cost;
      byOperation[record.operation] = (byOperation[record.operation] || 0) + record.cost;
    });

    return { totalCost, byProvider, byOperation, count: recent.length };
  }

  async getCreditsStatus(): Promise<{
    balance: number;
    spent24h: number;
    estimatedRunway: string;
  }> {
    const balance = await firebaseService.getCreditsBalance(this.userId);
    const report = await this.getCostReport(24);
    const spent24h = report.totalCost;

    // Estimate runway (days)
    const avgDaily = spent24h;
    const daysRemaining = avgDaily > 0 ? Math.floor(balance / (avgDaily * 100)) : 999;

    return {
      balance,
      spent24h,
      estimatedRunway: daysRemaining >= 30 ? '>1 month' : `${daysRemaining} days`
    };
  }
}

export const creditsService = new CreditsService();
