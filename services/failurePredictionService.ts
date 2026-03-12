/**
 * Failure Prediction Service - Reliability & Optimization
 * Features:
 * - Real-time anomaly detection (Latency, Error Rates, Throughput)
 * - Predictive failure modeling (Moving averages + standard deviation)
 * - Performance degradation warnings
 * - Recovery recommendations
 * - Historical analysis for trend detection
 */

import { errorHandlingService } from './errorHandlingService';
import { advancedSecurityServiceEnhanced } from './advancedSecurityServiceEnhanced';

export interface PerformanceMetric {
  serviceId: string;
  metricName: string;
  value: number;
  timestamp: Date;
}

export interface PredictionResult {
  serviceId: string;
  metricName: string;
  prediction: 'stable' | 'degrading' | 'critical';
  confidence: number;
  estimatedTimeToFailureMs?: number;
  recommendation?: string;
}

class FailurePredictionService {
  private history: Map<string, PerformanceMetric[]> = new Map();
  private readonly WINDOW_SIZE = 50; // Rolling window for analysis
  private readonly ANOMALY_THRESHOLD_SIGMA = 3; // 3-sigma rule

  /**
   * Record a new metric point and analyze for anomalies
   */
  async recordAndAnalyze(metric: PerformanceMetric): Promise<PredictionResult> {
    const key = `${metric.serviceId}_${metric.metricName}`;
    
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    
    const window = this.history.get(key)!;
    window.push(metric);
    
    // Keep window size
    if (window.length > this.WINDOW_SIZE) {
      window.shift();
    }

    const prediction = this.analyzeWindow(window);
    
    // Log if degrading or critical
    if (prediction.prediction !== 'stable') {
      console.warn(`⚠️ [FailurePrediction] ${key} is ${prediction.prediction.toUpperCase()} (Confidence: ${prediction.confidence}%)`);
      
      await advancedSecurityServiceEnhanced.persistAuditLog(
        'system',
        'PERFORMANCE_ALERT',
        metric.serviceId,
        { 
          metric: metric.metricName, 
          value: metric.value, 
          prediction: prediction.prediction,
          recommendation: prediction.recommendation 
        },
        'success'
      );
    }

    return prediction;
  }

  /**
   * Analyze window using statistical methods (Mean + Standard Deviation)
   */
  private analyzeWindow(window: PerformanceMetric[]): PredictionResult {
    const serviceId = window[0]?.serviceId || 'unknown';
    const metricName = window[0]?.metricName || 'unknown';

    if (window.length < 10) {
      return { serviceId, metricName, prediction: 'stable', confidence: 0 };
    }

    const values = window.map(m => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sqDiffs = values.map(v => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
    
    const latestValue = values[values.length - 1];
    const zScore = stdDev === 0 ? 0 : Math.abs(latestValue - mean) / stdDev;

    // Trend analysis (Simple linear regression slope)
    const trend = this.calculateTrend(values);

    let prediction: 'stable' | 'degrading' | 'critical' = 'stable';
    let confidence = 0;
    let recommendation = '';

    if (zScore > this.ANOMALY_THRESHOLD_SIGMA || trend > 0.5) {
      prediction = 'critical';
      confidence = Math.min(99, 70 + (zScore * 5));
      recommendation = `Immediate investigation required. ${metricName} is significantly deviating from mean.`;
    } else if (zScore > 1.5 || trend > 0.1) {
      prediction = 'degrading';
      confidence = Math.min(80, 40 + (zScore * 10));
      recommendation = `Monitor service closely. Potential performance degradation detected.`;
    }

    return {
      serviceId,
      metricName,
      prediction,
      confidence,
      recommendation
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get overall system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    alerts: PredictionResult[];
  }> {
    const alerts: PredictionResult[] = [];
    
    for (const [key, window] of this.history.entries()) {
      const result = this.analyzeWindow(window);
      if (result.prediction !== 'stable') {
        alerts.push(result);
      }
    }

    const status = alerts.some(a => a.prediction === 'critical') 
      ? 'critical' 
      : alerts.length > 0 ? 'warning' : 'healthy';

    return { status, alerts };
  }
}

export const failurePredictionService = new FailurePredictionService();
