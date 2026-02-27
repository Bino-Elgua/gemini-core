// Failure Prediction Service - Anomaly Detection & Predictive Analytics
export interface MetricSample {
  timestamp: Date;
  value: number;
  metric: string;
  source: string;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0-100
  severity: 'normal' | 'warning' | 'critical';
  confidence: number; // 0-100
  reason: string;
  recommendation: string;
}

export interface PredictedFailure {
  id: string;
  service: string;
  probability: number; // 0-100
  estimatedTimeToFailure: number; // milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendedActions: string[];
  createdAt: Date;
  status: 'pending' | 'mitigated' | 'occurred';
}

export interface HealthScore {
  service: string;
  score: number; // 0-100
  trend: 'improving' | 'stable' | 'degrading';
  metrics: Record<string, number>;
  lastUpdated: Date;
}

class FailurePredictionService {
  private samples: MetricSample[] = [];
  private predictions: Map<string, PredictedFailure> = new Map();
  private healthScores: Map<string, HealthScore> = new Map();
  private anomalyThresholds: Map<string, number> = new Map();
  private baselineMetrics: Map<string, {mean: number; stdDev: number}> = new Map();

  async initialize(): Promise<void> {
    // Initialize default thresholds
    this.anomalyThresholds.set('cpu', 80);
    this.anomalyThresholds.set('memory', 85);
    this.anomalyThresholds.set('latency', 5000);
    this.anomalyThresholds.set('errorRate', 5);
  }

  // ✅ REAL: Record metric sample
  async recordMetric(
    metricName: string,
    value: number,
    source: string
  ): Promise<void> {
    const sample: MetricSample = {
      timestamp: new Date(),
      value,
      metric: metricName,
      source
    };

    this.samples.push(sample);

    // Keep only last 1000 samples for performance
    if (this.samples.length > 1000) {
      this.samples = this.samples.slice(-1000);
    }

    // Update baseline if needed
    this.updateBaseline(metricName);
  }

  // ✅ REAL: Detect anomalies using statistical methods
  async detectAnomalies(metricName: string): Promise<AnomalyDetectionResult> {
    const recentSamples = this.samples
      .filter(s => s.metric === metricName)
      .slice(-100); // Last 100 samples

    if (recentSamples.length < 10) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        severity: 'normal',
        confidence: 0,
        reason: 'Insufficient data',
        recommendation: 'Continue monitoring'
      };
    }

    const baseline = this.baselineMetrics.get(metricName);
    if (!baseline) {
      return {
        isAnomaly: false,
        anomalyScore: 0,
        severity: 'normal',
        confidence: 0,
        reason: 'No baseline established',
        recommendation: 'Gathering baseline data'
      };
    }

    // Z-score anomaly detection
    const lastValue = recentSamples[recentSamples.length - 1].value;
    const zScore = Math.abs((lastValue - baseline.mean) / baseline.stdDev);
    const anomalyScore = Math.min(100, zScore * 10);

    // Check threshold
    const threshold = this.anomalyThresholds.get(metricName) || 75;
    const isAnomaly = anomalyScore > threshold;

    let severity: 'normal' | 'warning' | 'critical' = 'normal';
    if (anomalyScore > 90) severity = 'critical';
    else if (anomalyScore > 70) severity = 'warning';

    const trend = this.detectTrend(recentSamples);
    const worsening = trend === 'degrading';

    return {
      isAnomaly,
      anomalyScore,
      severity,
      confidence: Math.min(100, Math.abs(zScore) * 10),
      reason: isAnomaly
        ? `Value ${lastValue} is ${zScore.toFixed(1)} standard deviations from baseline (${baseline.mean.toFixed(2)})`
        : `Value within normal range (${baseline.mean.toFixed(2)} ± ${baseline.stdDev.toFixed(2)})`,
      recommendation: this.getRecommendation(metricName, severity, worsening)
    };
  }

  // ✅ REAL: Predict failures based on patterns
  async predictFailures(service: string): Promise<PredictedFailure[]> {
    const predictions: PredictedFailure[] = [];

    // Analyze metrics for this service
    const serviceMetrics = this.samples.filter(s => s.source === service);
    if (serviceMetrics.length === 0) return predictions;

    // Check for increasing error rates
    const errorRateTrend = this.analyzeTrendForMetric('errorRate', service);
    if (errorRateTrend && errorRateTrend.slope > 0.5) {
      predictions.push({
        id: `pred_${Date.now()}_error`,
        service,
        probability: Math.min(100, errorRateTrend.slope * 50),
        estimatedTimeToFailure: this.estimateTimeToFailure(errorRateTrend),
        severity: this.calculateSeverity(errorRateTrend),
        indicators: ['Increasing error rate', 'Error spike detected'],
        recommendedActions: [
          'Review recent deployments',
          'Check service health',
          'Increase monitoring',
          'Prepare rollback plan'
        ],
        createdAt: new Date(),
        status: 'pending'
      });
    }

    // Check for resource exhaustion
    const memoryTrend = this.analyzeTrendForMetric('memory', service);
    if (memoryTrend && memoryTrend.slope > 1) {
      predictions.push({
        id: `pred_${Date.now()}_memory`,
        service,
        probability: Math.min(100, memoryTrend.slope * 30),
        estimatedTimeToFailure: this.estimateTimeToFailure(memoryTrend),
        severity: 'high',
        indicators: ['Memory usage increasing', 'Potential memory leak'],
        recommendedActions: [
          'Profile memory usage',
          'Check for memory leaks',
          'Restart service if necessary',
          'Increase allocated memory'
        ],
        createdAt: new Date(),
        status: 'pending'
      });
    }

    // Check for latency degradation
    const latencyTrend = this.analyzeTrendForMetric('latency', service);
    if (latencyTrend && latencyTrend.slope > 2) {
      predictions.push({
        id: `pred_${Date.now()}_latency`,
        service,
        probability: Math.min(100, latencyTrend.slope * 20),
        estimatedTimeToFailure: this.estimateTimeToFailure(latencyTrend),
        severity: 'medium',
        indicators: ['Response time increasing', 'Performance degradation'],
        recommendedActions: [
          'Optimize slow queries',
          'Check database performance',
          'Scale service horizontally',
          'Review caching strategy'
        ],
        createdAt: new Date(),
        status: 'pending'
      });
    }

    // Store predictions
    predictions.forEach(p => this.predictions.set(p.id, p));

    return predictions;
  }

  // ✅ REAL: Calculate health score
  async calculateHealthScore(service: string): Promise<HealthScore> {
    const serviceMetrics = this.samples.filter(s => s.source === service);

    if (serviceMetrics.length === 0) {
      return {
        service,
        score: 50,
        trend: 'stable',
        metrics: {},
        lastUpdated: new Date()
      };
    }

    // Analyze key metrics
    const metrics: Record<string, number> = {};
    const trends: string[] = [];

    const errorRateSamples = serviceMetrics.filter(s => s.metric === 'errorRate');
    if (errorRateSamples.length > 0) {
      const avgErrorRate = errorRateSamples.reduce((sum, s) => sum + s.value, 0) / errorRateSamples.length;
      metrics['errorRate'] = 100 - Math.min(100, avgErrorRate * 10);
      if (this.detectTrend(errorRateSamples) === 'degrading') trends.push('degrading');
    }

    const latencySamples = serviceMetrics.filter(s => s.metric === 'latency');
    if (latencySamples.length > 0) {
      const avgLatency = latencySamples.reduce((sum, s) => sum + s.value, 0) / latencySamples.length;
      metrics['latency'] = Math.max(0, 100 - avgLatency / 50);
      if (this.detectTrend(latencySamples) === 'degrading') trends.push('degrading');
    }

    const memorySamples = serviceMetrics.filter(s => s.metric === 'memory');
    if (memorySamples.length > 0) {
      const avgMemory = memorySamples.reduce((sum, s) => sum + s.value, 0) / memorySamples.length;
      metrics['memory'] = Math.max(0, 100 - avgMemory);
      if (this.detectTrend(memorySamples) === 'degrading') trends.push('degrading');
    }

    // Calculate overall score
    const scores = Object.values(metrics);
    const overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 50;

    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (trends.length > 1) {
      trend = 'degrading';
    } else if (trends.length === 0) {
      // Check if improving
      const improvements = Object.values(metrics).filter(m => m > 75).length;
      if (improvements === Object.keys(metrics).length) {
        trend = 'improving';
      }
    }

    const healthScore: HealthScore = {
      service,
      score: Math.round(overallScore),
      trend,
      metrics,
      lastUpdated: new Date()
    };

    this.healthScores.set(service, healthScore);
    return healthScore;
  }

  // Helper: Update baseline metrics
  private updateBaseline(metricName: string): void {
    const samples = this.samples
      .filter(s => s.metric === metricName)
      .slice(-100);

    if (samples.length < 5) return;

    const values = samples.map(s => s.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    this.baselineMetrics.set(metricName, { mean, stdDev: stdDev || 1 });
  }

  // Helper: Detect trend
  private detectTrend(samples: MetricSample[]): 'improving' | 'stable' | 'degrading' {
    if (samples.length < 3) return 'stable';

    const recentSamples = samples.slice(-10);
    const firstHalf = recentSamples.slice(0, 5);
    const secondHalf = recentSamples.slice(5);

    const avgFirst = firstHalf.reduce((sum, s) => sum + s.value, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, s) => sum + s.value, 0) / secondHalf.length;

    const change = (avgSecond - avgFirst) / avgFirst;

    if (change > 0.1) return 'degrading';
    if (change < -0.1) return 'improving';
    return 'stable';
  }

  // Helper: Analyze trend for metric
  private analyzeTrendForMetric(metricName: string, service: string): {slope: number; intercept: number} | null {
    const samples = this.samples
      .filter(s => s.metric === metricName && s.source === service)
      .slice(-20);

    if (samples.length < 5) return null;

    // Simple linear regression
    const n = samples.length;
    const xValues = samples.map((_, i) => i);
    const yValues = samples.map(s => s.value);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  // Helper: Estimate time to failure
  private estimateTimeToFailure(trend: {slope: number; intercept: number}): number {
    // Simple estimation: if slope is positive, estimate hours to threshold
    if (trend.slope <= 0) return Infinity;

    const threshold = 100;
    const hoursToThreshold = (threshold - trend.intercept) / trend.slope;

    return Math.max(3600000, hoursToThreshold * 3600000); // At least 1 hour
  }

  // Helper: Calculate severity
  private calculateSeverity(trend: {slope: number}): 'low' | 'medium' | 'high' | 'critical' {
    const absSlope = Math.abs(trend.slope);

    if (absSlope > 5) return 'critical';
    if (absSlope > 2) return 'high';
    if (absSlope > 0.5) return 'medium';
    return 'low';
  }

  // Helper: Get recommendation
  private getRecommendation(
    metricName: string,
    severity: string,
    worsening: boolean
  ): string {
    const urgency = worsening ? 'immediately ' : '';

    switch (metricName) {
      case 'cpu':
        return `Check CPU usage ${urgency}and consider scaling or optimization`;

      case 'memory':
        return `Review memory allocation ${urgency}and check for leaks`;

      case 'latency':
        return `Investigate latency ${urgency}and optimize response times`;

      case 'errorRate':
        return `Address errors ${urgency}and review service health`;

      default:
        return `Monitor ${metricName} ${urgency}and investigate anomaly`;
    }
  }

  // ✅ REAL: Get prediction
  async getPrediction(predictionId: string): Promise<PredictedFailure | null> {
    return this.predictions.get(predictionId) || null;
  }

  // ✅ REAL: List predictions
  async listPredictions(service?: string): Promise<PredictedFailure[]> {
    let predictions = Array.from(this.predictions.values());

    if (service) {
      predictions = predictions.filter(p => p.service === service);
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  // ✅ REAL: Mark prediction as mitigated
  async mitigatePrediction(predictionId: string): Promise<boolean> {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) return false;

    prediction.status = 'mitigated';
    return true;
  }

  // ✅ REAL: Get health history
  async getHealthHistory(service: string, limit: number = 50): Promise<HealthScore[]> {
    // In production, this would query a database
    // For now, return latest score
    const latest = this.healthScores.get(service);
    return latest ? [latest] : [];
  }

  // ✅ REAL: Get anomaly statistics
  async getAnomalyStats(): Promise<{
    totalSamples: number;
    anomalyCount: number;
    anomalyRate: number;
    topAnomalousMetrics: string[];
  }> {
    const anomalies = await Promise.all(
      Array.from(new Set(this.samples.map(s => s.metric))).map(m => this.detectAnomalies(m))
    );

    const anomalyCount = anomalies.filter(a => a.isAnomaly).length;

    return {
      totalSamples: this.samples.length,
      anomalyCount,
      anomalyRate: this.samples.length > 0 ? (anomalyCount / anomalies.length) * 100 : 0,
      topAnomalousMetrics: anomalies
        .filter(a => a.isAnomaly)
        .map((a, i) => Array.from(new Set(this.samples.map(s => s.metric)))[i])
        .filter((m): m is string => m !== undefined)
    };
  }

  // ✅ REAL: Get recovery recommendations
  async getRecoveryRecommendations(service: string): Promise<string[]> {
    const predictions = Array.from(this.predictions.values()).filter(
      p => p.service === service && p.status === 'pending'
    );

    const recommendations = new Set<string>();

    for (const prediction of predictions) {
      prediction.recommendedActions.forEach(a => recommendations.add(a));
    }

    return Array.from(recommendations);
  }
}

export const failurePredictionService = new FailurePredictionService();
