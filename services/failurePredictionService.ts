// Failure Prediction Service - ML-based anomaly detection and predictive analysis
export interface MetricSnapshot {
  timestamp: Date;
  metric: string;
  value: number;
  threshold?: number;
}

export interface AnomalyDetection {
  id: string;
  metric: string;
  timestamp: Date;
  value: number;
  expectedRange: { min: number; max: number };
  zScore: number;
  isAnomaly: boolean;
  confidence: number;
}

export interface FailurePrediction {
  id: string;
  metric: string;
  predictedFailureTime: Date;
  probability: number; // 0-1
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
  confidence: number;
}

export interface MetricsHistory {
  metric: string;
  values: number[];
  timestamps: Date[];
  mean: number;
  stdDev: number;
}

class FailurePredictionService {
  private metricsHistory: Map<string, MetricsHistory> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private predictions: FailurePrediction[] = [];
  private thresholds = new Map<string, { warning: number; critical: number }>();

  async initialize(): Promise<void> {
    this.setupDefaultMetrics();
  }

  private setupDefaultMetrics(): void {
    // Setup default thresholds
    this.thresholds.set('cpu_usage', { warning: 75, critical: 90 });
    this.thresholds.set('memory_usage', { warning: 80, critical: 95 });
    this.thresholds.set('error_rate', { warning: 5, critical: 10 });
    this.thresholds.set('response_time', { warning: 500, critical: 2000 });
    this.thresholds.set('database_connections', { warning: 100, critical: 150 });
  }

  async recordMetric(metric: string, value: number): Promise<void> {
    if (!this.metricsHistory.has(metric)) {
      this.metricsHistory.set(metric, {
        metric,
        values: [],
        timestamps: [],
        mean: 0,
        stdDev: 0
      });
    }

    const history = this.metricsHistory.get(metric)!;
    history.values.push(value);
    history.timestamps.push(new Date());

    // Keep last 1000 data points
    if (history.values.length > 1000) {
      history.values = history.values.slice(-1000);
      history.timestamps = history.timestamps.slice(-1000);
    }

    // Update statistics
    this.updateStatistics(metric);

    // Detect anomalies
    const anomaly = await this.detectAnomaly(metric, value);
    if (anomaly.isAnomaly) {
      this.anomalies.push(anomaly);
    }
  }

  private updateStatistics(metric: string): void {
    const history = this.metricsHistory.get(metric);
    if (!history || history.values.length === 0) return;

    // Calculate mean
    const sum = history.values.reduce((a, b) => a + b, 0);
    history.mean = sum / history.values.length;

    // Calculate standard deviation
    const squaredDiffs = history.values.map(v => Math.pow(v - history.mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / history.values.length;
    history.stdDev = Math.sqrt(avgSquaredDiff);
  }

  private async detectAnomaly(metric: string, value: number): Promise<AnomalyDetection> {
    const history = this.metricsHistory.get(metric);
    if (!history || history.values.length < 3) {
      return {
        id: `anomaly_${Date.now()}`,
        metric,
        timestamp: new Date(),
        value,
        expectedRange: { min: 0, max: 0 },
        zScore: 0,
        isAnomaly: false,
        confidence: 0
      };
    }

    // Calculate Z-score
    const zScore = (value - history.mean) / (history.stdDev || 1);

    // Z-score > 3 is typically considered anomalous
    const isAnomaly = Math.abs(zScore) > 3;

    // Calculate confidence
    const confidence = Math.min(1, Math.abs(zScore) / 5);

    return {
      id: `anomaly_${Date.now()}`,
      metric,
      timestamp: new Date(),
      value,
      expectedRange: {
        min: history.mean - 2 * history.stdDev,
        max: history.mean + 2 * history.stdDev
      },
      zScore,
      isAnomaly,
      confidence
    };
  }

  async predictFailure(metric: string): Promise<FailurePrediction | null> {
    const history = this.metricsHistory.get(metric);
    if (!history || history.values.length < 10) {
      return null;
    }

    // Simple trend analysis (ARIMA-like)
    const recentValues = history.values.slice(-10);
    const trend = this.calculateTrend(recentValues);

    if (trend <= 0) {
      return null; // Metric improving, no failure predicted
    }

    // Calculate time to threshold
    const threshold = this.thresholds.get(metric);
    if (!threshold) {
      return null;
    }

    const currentValue = recentValues[recentValues.length - 1];
    const dailyIncrease = trend;

    if (dailyIncrease <= 0) {
      return null;
    }

    const daysToWarning = (threshold.warning - currentValue) / dailyIncrease;
    const daysToCritical = (threshold.critical - currentValue) / dailyIncrease;

    const prediction: FailurePrediction = {
      id: `prediction_${Date.now()}`,
      metric,
      predictedFailureTime: new Date(Date.now() + Math.min(daysToWarning, daysToCritical) * 24 * 60 * 60 * 1000),
      probability: Math.min(1, Math.max(0, trend / 10)),
      severity: daysToCritical < 1 ? 'critical' : daysToWarning < 3 ? 'high' : 'medium',
      recommendations: this.generateRecommendations(metric, trend),
      confidence: 0.7 + (Math.min(trend, 5) / 10) * 0.3
    };

    this.predictions.push(prediction);
    return prediction;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < values.length; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const n = values.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  private generateRecommendations(metric: string, trend: number): string[] {
    const recommendations: string[] = [];

    if (metric.includes('cpu')) {
      recommendations.push('Optimize resource-heavy operations');
      recommendations.push('Consider horizontal scaling');
      recommendations.push('Profile application for bottlenecks');
    }

    if (metric.includes('memory')) {
      recommendations.push('Check for memory leaks');
      recommendations.push('Increase memory allocation');
      recommendations.push('Optimize data structures');
    }

    if (metric.includes('error')) {
      recommendations.push('Review recent changes');
      recommendations.push('Check service dependencies');
      recommendations.push('Increase monitoring');
    }

    if (metric.includes('response')) {
      recommendations.push('Optimize database queries');
      recommendations.push('Implement caching');
      recommendations.push('Check network connectivity');
    }

    if (metric.includes('connection')) {
      recommendations.push('Review connection pool settings');
      recommendations.push('Check for connection leaks');
      recommendations.push('Optimize database queries');
    }

    return recommendations;
  }

  async getAnomalies(metric?: string, limit: number = 100): Promise<AnomalyDetection[]> {
    let anomalies = this.anomalies;

    if (metric) {
      anomalies = anomalies.filter(a => a.metric === metric);
    }

    return anomalies.slice(-limit);
  }

  async getPredictions(metric?: string, limit: number = 50): Promise<FailurePrediction[]> {
    let predictions = this.predictions;

    if (metric) {
      predictions = predictions.filter(p => p.metric === metric);
    }

    return predictions.slice(-limit);
  }

  async getMetricsHistory(metric: string): Promise<MetricsHistory | null> {
    return this.metricsHistory.get(metric) || null;
  }

  async setThreshold(metric: string, warning: number, critical: number): Promise<void> {
    this.thresholds.set(metric, { warning, critical });
  }

  async getThreshold(metric: string): Promise<{ warning: number; critical: number } | null> {
    return this.thresholds.get(metric) || null;
  }

  async analyzeMetric(metric: string): Promise<{
    metric: string;
    currentValue: number;
    mean: number;
    stdDev: number;
    trend: number;
    anomaly: AnomalyDetection | null;
    prediction: FailurePrediction | null;
    health: 'healthy' | 'warning' | 'critical';
  } | null> {
    const history = this.metricsHistory.get(metric);
    if (!history || history.values.length === 0) {
      return null;
    }

    const currentValue = history.values[history.values.length - 1];
    const trend = this.calculateTrend(history.values.slice(-10));
    const recentAnomaly = this.anomalies
      .filter(a => a.metric === metric)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0] || null;
    const prediction = await this.predictFailure(metric);

    const threshold = this.thresholds.get(metric);
    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (threshold) {
      if (currentValue >= threshold.critical) {
        health = 'critical';
      } else if (currentValue >= threshold.warning) {
        health = 'warning';
      }
    }

    return {
      metric,
      currentValue,
      mean: history.mean,
      stdDev: history.stdDev,
      trend,
      anomaly: recentAnomaly,
      prediction,
      health
    };
  }

  async getHealthSummary(): Promise<{
    totalMetrics: number;
    healthyMetrics: number;
    warningMetrics: number;
    criticalMetrics: number;
    totalAnomalies: number;
    activePredictions: number;
  }> {
    const metrics = Array.from(this.metricsHistory.keys());
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const metric of metrics) {
      const analysis = await this.analyzeMetric(metric);
      if (analysis) {
        if (analysis.health === 'healthy') healthyCount++;
        else if (analysis.health === 'warning') warningCount++;
        else criticalCount++;
      }
    }

    const activePredictions = this.predictions.filter(
      p => p.predictedFailureTime > new Date()
    ).length;

    return {
      totalMetrics: metrics.length,
      healthyMetrics: healthyCount,
      warningMetrics: warningCount,
      criticalMetrics: criticalCount,
      totalAnomalies: this.anomalies.length,
      activePredictions
    };
  }

  async clearOldData(olderThanDays: number = 30): Promise<void> {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    for (const history of this.metricsHistory.values()) {
      const keepIndices = history.timestamps
        .map((t, i) => t > cutoffTime ? i : -1)
        .filter(i => i >= 0);

      if (keepIndices.length > 0) {
        history.values = keepIndices.map(i => history.values[i]);
        history.timestamps = keepIndices.map(i => history.timestamps[i]);
      }
    }

    this.anomalies = this.anomalies.filter(a => a.timestamp > cutoffTime);
    this.predictions = this.predictions.filter(p => p.predictedFailureTime > cutoffTime);
  }
}

export const failurePredictionService = new FailurePredictionService();
