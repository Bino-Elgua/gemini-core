import { hybridStorage } from './hybridStorageService';

interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  hypothesis: string;
  variants: TestVariant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  sampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  results?: TestResults;
  winner?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TestVariant {
  id: string;
  name: string;
  description: string;
  changes: Record<string, any>;
  trafficPercentage: number;
  conversions: number;
  impressions: number;
  conversionRate: number;
  engagement: number;
}

interface TestResults {
  totalImpressions: number;
  totalConversions: number;
  overallConversionRate: number;
  statisticalSignificance: number;
  winnerVariantId?: string;
  winningMargin: number;
  recommendations: string[];
}

class ABTestingService {
  async createTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    // Normalize traffic percentages
    const totalTraffic = test.variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (totalTraffic !== 100) {
      test.variants = test.variants.map(v => ({
        ...v,
        trafficPercentage: (v.trafficPercentage / totalTraffic) * 100
      }));
    }

    const newTest: ABTest = {
      ...test,
      id: `test-${Date.now()}`,
      variants: test.variants.map(v => ({
        ...v,
        conversions: 0,
        impressions: 0,
        conversionRate: 0,
        engagement: 0
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await hybridStorage.set(`ab-test-${newTest.id}`, newTest);
    console.log(`✅ A/B test created: ${newTest.name}`);

    return newTest;
  }

  async getTest(id: string): Promise<ABTest | null> {
    return await hybridStorage.get(`ab-test-${id}`);
  }

  async listTestsByCampaign(campaignId: string): Promise<ABTest[]> {
    const allData = await hybridStorage.getAll();
    const tests: ABTest[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('ab-test-') && value && value.campaignId === campaignId) {
        tests.push(value);
      }
    }

    return tests;
  }

  async recordImpression(testId: string, variantId: string): Promise<void> {
    const test = await this.getTest(testId);
    if (!test) throw new Error('Test not found');

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) throw new Error('Variant not found');

    variant.impressions++;
    test.updatedAt = new Date();

    await hybridStorage.set(`ab-test-${testId}`, test);
  }

  async recordConversion(testId: string, variantId: string, value: number = 1): Promise<void> {
    const test = await this.getTest(testId);
    if (!test) throw new Error('Test not found');

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) throw new Error('Variant not found');

    variant.conversions += value;
    variant.conversionRate = variant.impressions > 0 
      ? (variant.conversions / variant.impressions) * 100 
      : 0;
    
    test.updatedAt = new Date();

    await hybridStorage.set(`ab-test-${testId}`, test);
    console.log(`✅ Conversion recorded for variant: ${variant.name}`);
  }

  async startTest(id: string): Promise<void> {
    const test = await this.getTest(id);
    if (!test) throw new Error('Test not found');

    test.status = 'running';
    test.startDate = new Date();

    await hybridStorage.set(`ab-test-${id}`, test);
    console.log(`✅ A/B test started: ${test.name}`);
  }

  async pauseTest(id: string): Promise<void> {
    const test = await this.getTest(id);
    if (!test) throw new Error('Test not found');

    test.status = 'paused';

    await hybridStorage.set(`ab-test-${id}`, test);
    console.log(`⏸️ A/B test paused: ${test.name}`);
  }

  async completeTest(id: string): Promise<ABTest> {
    const test = await this.getTest(id);
    if (!test) throw new Error('Test not found');

    test.status = 'completed';
    test.endDate = new Date();

    // Calculate results
    test.results = this.calculateResults(test);
    test.winner = test.results.winnerVariantId;

    await hybridStorage.set(`ab-test-${id}`, test);
    console.log(`✅ A/B test completed: ${test.name}`);
    console.log(`🏆 Winner: ${test.variants.find(v => v.id === test.winner)?.name}`);

    return test;
  }

  private calculateResults(test: ABTest): TestResults {
    const totalImpressions = test.variants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = test.variants.reduce((sum, v) => sum + v.conversions, 0);
    const overallConversionRate = totalImpressions > 0 
      ? (totalConversions / totalImpressions) * 100 
      : 0;

    // Simple winner detection (highest conversion rate with min sample)
    const validVariants = test.variants.filter(v => v.impressions >= test.sampleSize);
    let winner: TestVariant | undefined;
    let maxConversionRate = 0;

    for (const variant of validVariants) {
      if (variant.conversionRate > maxConversionRate) {
        maxConversionRate = variant.conversionRate;
        winner = variant;
      }
    }

    const winningMargin = winner && test.variants.length > 1
      ? maxConversionRate - (test.variants.find(v => v.id !== winner!.id)?.conversionRate || 0)
      : 0;

    const recommendations = this.generateRecommendations(test, winner, winningMargin);

    return {
      totalImpressions,
      totalConversions,
      overallConversionRate,
      statisticalSignificance: this.calculateStatisticalSignificance(test),
      winnerVariantId: winner?.id,
      winningMargin,
      recommendations
    };
  }

  private calculateStatisticalSignificance(test: ABTest): number {
    // Simplified chi-square calculation
    const expectedConversions = test.variants.reduce((sum, v) => sum + v.conversions, 0) / test.variants.length;
    
    let chiSquare = 0;
    for (const variant of test.variants) {
      const observed = variant.conversions;
      const expected = expectedConversions;
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    }

    return Math.min(chiSquare, 99.99);
  }

  private generateRecommendations(test: ABTest, winner: TestVariant | undefined, margin: number): string[] {
    const recommendations: string[] = [];

    if (!winner) {
      recommendations.push('No clear winner yet. Continue running the test for more statistical significance.');
    } else if (margin < 5) {
      recommendations.push('Winner found but margin is small. Consider running longer for confidence.');
    } else {
      recommendations.push(`Strong winner detected: ${winner.name} with ${margin.toFixed(2)}% improvement.`);
      recommendations.push(`Recommend implementing winning variant across ${(100 - winner.trafficPercentage).toFixed(0)}% of traffic.`);
    }

    if (test.variants.some(v => v.impressions < test.sampleSize)) {
      recommendations.push(`Some variants have not reached sample size of ${test.sampleSize}. Continue testing.`);
    }

    return recommendations;
  }

  async getTestResults(id: string): Promise<TestResults | null> {
    const test = await this.getTest(id);
    return test?.results || null;
  }

  async archiveTest(id: string): Promise<void> {
    const test = await this.getTest(id);
    if (!test) throw new Error('Test not found');

    await hybridStorage.set(`ab-test-archive-${id}`, test);
    await hybridStorage.remove(`ab-test-${id}`);
    console.log(`✅ Test archived: ${test.name}`);
  }
}

export const abTestingService = new ABTestingService();
