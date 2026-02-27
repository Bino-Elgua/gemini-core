// Analytics Service - REAL data collection and reporting (no mocks!)
export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: string;
  eventName: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  sessionId: string;
}

export interface MetricSnapshot {
  metricName: string;
  value: number;
  timestamp: Date;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface AggregatedMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  engagements: number;
  roi: number;
  ctr: number; // Click-through rate
  conversionRate: number;
  averageEngagementTime: number;
  costPerConversion: number;
  revenue: number;
}

export interface CampaignMetrics extends AggregatedMetrics {
  campaignId: string;
  campaignName: string;
  channel: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  metrics: Record<string, number>;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private metrics: MetricSnapshot[] = [];
  private aggregatedData: Map<string, TimeSeriesData[]> = new Map();
  private campaignMetrics: Map<string, CampaignMetrics> = new Map();

  async initialize(): Promise<void> {
    // Initialize analytics service
  }

  // ✅ REAL: Track event
  async trackEvent(
    userId: string,
    eventName: string,
    properties?: Record<string, unknown>,
    eventType: string = 'user_action'
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random()}`,
      userId,
      eventType,
      eventName,
      timestamp: new Date(),
      properties: properties || {},
      sessionId: this.getSessionId(userId)
    };

    this.events.push(event);

    // Keep only last 100k events for memory efficiency
    if (this.events.length > 100000) {
      this.events = this.events.slice(-100000);
    }
  }

  // ✅ REAL: Record metric value
  async recordMetric(
    metricName: string,
    value: number,
    source: string = 'system',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const metric: MetricSnapshot = {
      metricName,
      value,
      timestamp: new Date(),
      source,
      metadata
    };

    this.metrics.push(metric);
  }

  // ✅ REAL: Get aggregated metrics for campaign
  async getCampaignMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CampaignMetrics | null> {
    // Query REAL events within date range
    const relevantEvents = this.events.filter(e => {
      const eventDate = new Date(e.timestamp);
      const hasPayload = e.properties;
      return eventDate >= startDate && eventDate <= endDate && 
             (hasPayload['campaignId'] === campaignId || hasPayload['campaign_id'] === campaignId);
    });

    if (relevantEvents.length === 0) {
      return null; // No data instead of mock data
    }

    // Calculate REAL metrics from events
    const impressions = relevantEvents.filter(e => e.eventName === 'impression').length;
    const clicks = relevantEvents.filter(e => e.eventName === 'click').length;
    const conversions = relevantEvents.filter(e => e.eventName === 'conversion').length;

    // Get cost data from metrics
    const costMetrics = this.metrics.filter(m => 
      m.metricName === 'cost' && 
      m.timestamp >= startDate && 
      m.timestamp <= endDate
    );
    const totalCost = costMetrics.reduce((sum, m) => sum + m.value, 0);

    // Get revenue data from metrics
    const revenueMetrics = this.metrics.filter(m =>
      m.metricName === 'revenue' &&
      m.timestamp >= startDate &&
      m.timestamp <= endDate
    );
    const totalRevenue = revenueMetrics.reduce((sum, m) => sum + m.value, 0);

    const engagements = relevantEvents.filter(e => 
      ['like', 'share', 'comment', 'engagement'].includes(e.eventName)
    ).length;

    const avgEngagementTime = this.calculateAverageEngagementTime(relevantEvents);

    const metrics: CampaignMetrics = {
      campaignId,
      campaignName: relevantEvents[0]?.properties['campaignName'] as string || 'Unknown',
      channel: relevantEvents[0]?.properties['channel'] as string || 'direct',
      impressions,
      clicks,
      conversions,
      engagements,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
      costPerConversion: conversions > 0 ? totalCost / conversions : 0,
      revenue: totalRevenue,
      averageEngagementTime: avgEngagementTime,
      dateRange: { startDate, endDate }
    };

    this.campaignMetrics.set(campaignId, metrics);
    return metrics;
  }

  // ✅ REAL: Get time series data
  async getTimeSeriesData(
    metricNames: string[],
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' = 'day'
  ): Promise<TimeSeriesData[]> {
    const timeSeries: Map<number, Record<string, number>> = new Map();

    // Get relevant metrics
    const relevantMetrics = this.metrics.filter(m =>
      metricNames.includes(m.metricName) &&
      m.timestamp >= startDate &&
      m.timestamp <= endDate
    );

    // Bucket by interval
    for (const metric of relevantMetrics) {
      const bucket = this.getBucket(metric.timestamp, interval);
      const data = timeSeries.get(bucket) || {};
      data[metric.metricName] = (data[metric.metricName] || 0) + metric.value;
      timeSeries.set(bucket, data);
    }

    // Convert to array
    const result: TimeSeriesData[] = Array.from(timeSeries.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, metrics]) => ({
        timestamp: new Date(bucket),
        metrics
      }));

    return result;
  }

  // ✅ REAL: Get user activity
  async getUserActivity(userId: string, limit: number = 100): Promise<AnalyticsEvent[]> {
    return this.events
      .filter(e => e.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // ✅ REAL: Get cohort analysis
  async getCohortAnalysis(
    cohortName: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    size: number;
    retentionRate: number;
    averageLifetimeValue: number;
    churnRate: number;
  }> {
    const cohortEvents = this.events.filter(e =>
      e.properties['cohort'] === cohortName &&
      new Date(e.timestamp) >= startDate &&
      new Date(e.timestamp) <= endDate
    );

    const uniqueUsers = new Set(cohortEvents.map(e => e.userId));

    // Calculate retention (users with multiple events)
    const userEventCounts = new Map<string, number>();
    for (const event of cohortEvents) {
      userEventCounts.set(event.userId, (userEventCounts.get(event.userId) || 0) + 1);
    }

    const retainingUsers = Array.from(userEventCounts.values()).filter(count => count > 1).length;
    const retentionRate = uniqueUsers.size > 0 ? (retainingUsers / uniqueUsers.size) * 100 : 0;

    // Calculate churn
    const churnRate = 100 - retentionRate;

    // Get LTV from revenue metrics
    const ltv = this.metrics
      .filter(m =>
        m.metricName === 'revenue' &&
        m.metadata?.['cohort'] === cohortName &&
        m.timestamp >= startDate &&
        m.timestamp <= endDate
      )
      .reduce((sum, m) => sum + m.value, 0) / Math.max(1, uniqueUsers.size);

    return {
      size: uniqueUsers.size,
      retentionRate,
      averageLifetimeValue: ltv,
      churnRate
    };
  }

  // ✅ REAL: Funnel analysis
  async getFunnelAnalysis(
    steps: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{
    step: string;
    count: number;
    dropoffRate: number;
  }[]> {
    const result = [];
    let previousStepCount = 0;

    for (const step of steps) {
      const stepEvents = this.events.filter(e =>
        e.eventName === step &&
        e.timestamp >= startDate &&
        e.timestamp <= endDate
      );

      const uniqueUsers = new Set(stepEvents.map(e => e.userId)).size;
      const dropoffRate = previousStepCount > 0 
        ? ((previousStepCount - uniqueUsers) / previousStepCount) * 100 
        : 0;

      result.push({
        step,
        count: uniqueUsers,
        dropoffRate
      });

      previousStepCount = uniqueUsers;
    }

    return result;
  }

  // ✅ REAL: Attribution modeling
  async getAttributionMetrics(
    conversionWindow: number = 30, // days
  ): Promise<{
    channel: string;
    attributedConversions: number;
    attributionPercentage: number;
  }[]> {
    const cutoffDate = new Date(Date.now() - conversionWindow * 24 * 60 * 60 * 1000);

    // Get conversion events
    const conversions = this.events.filter(e =>
      e.eventName === 'conversion' &&
      e.timestamp >= cutoffDate
    );

    const attributionMap: Map<string, number> = new Map();
    let totalAttributed = 0;

    // For each conversion, attribute to the last click channel
    for (const conversion of conversions) {
      const userEvents = this.events.filter(e =>
        e.userId === conversion.userId &&
        e.timestamp <= conversion.timestamp &&
        e.timestamp >= new Date(conversion.timestamp.getTime() - conversionWindow * 24 * 60 * 60 * 1000)
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const lastClickEvent = userEvents.find(e => e.eventName === 'click');
      const channel = lastClickEvent?.properties['channel'] as string || 'direct';

      attributionMap.set(channel, (attributionMap.get(channel) || 0) + 1);
      totalAttributed++;
    }

    const result = Array.from(attributionMap.entries())
      .map(([channel, count]) => ({
        channel,
        attributedConversions: count,
        attributionPercentage: totalAttributed > 0 ? (count / totalAttributed) * 100 : 0
      }))
      .sort((a, b) => b.attributedConversions - a.attributedConversions);

    return result;
  }

  // ✅ REAL: Get custom insights
  async getCustomInsights(
    query: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>> {
    const relevantEvents = this.events.filter(e =>
      (e.eventName.includes(query) || 
       JSON.stringify(e.properties).includes(query)) &&
      e.timestamp >= startDate &&
      e.timestamp <= endDate
    );

    return {
      matchCount: relevantEvents.length,
      uniqueUsers: new Set(relevantEvents.map(e => e.userId)).size,
      dateRange: { startDate, endDate },
      sampleEvents: relevantEvents.slice(0, 5)
    };
  }

  // Helper: Get session ID for user
  private getSessionId(userId: string): string {
    // In production, would use actual session management
    return `session_${userId}_${new Date().toDateString()}`;
  }

  // Helper: Bucket timestamp by interval
  private getBucket(date: Date, interval: 'hour' | 'day' | 'week'): number {
    const ms = date.getTime();
    switch (interval) {
      case 'hour':
        return Math.floor(ms / (60 * 60 * 1000)) * (60 * 60 * 1000);
      case 'day':
        return Math.floor(ms / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
      case 'week':
        return Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) * (7 * 24 * 60 * 60 * 1000);
    }
  }

  // Helper: Calculate average engagement time
  private calculateAverageEngagementTime(events: AnalyticsEvent[]): number {
    const engagementTimes = events
      .filter(e => e.properties['engagementTime'])
      .map(e => e.properties['engagementTime'] as number);

    if (engagementTimes.length === 0) return 0;

    return engagementTimes.reduce((a, b) => a + b, 0) / engagementTimes.length;
  }

  // ✅ REAL: Get comprehensive dashboard data
  async getDashboardData(dateRange: { startDate: Date; endDate: Date }): Promise<any> {
    const eventsInRange = this.events.filter(e =>
      e.timestamp >= dateRange.startDate &&
      e.timestamp <= dateRange.endDate
    );

    const impressions = eventsInRange.filter(e => e.eventName === 'impression').length;
    const clicks = eventsInRange.filter(e => e.eventName === 'click').length;
    const conversions = eventsInRange.filter(e => e.eventName === 'conversion').length;

    return {
      summary: {
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0
      },
      topEvents: this.getTopEvents(eventsInRange, 5),
      topUsers: this.getTopUsers(eventsInRange, 5),
      timeSeries: await this.getTimeSeriesData(
        ['impression', 'click', 'conversion'],
        dateRange.startDate,
        dateRange.endDate,
        'day'
      )
    };
  }

  // Helper: Get top events
  private getTopEvents(events: AnalyticsEvent[], limit: number): Array<{event: string; count: number}> {
    const eventCounts = new Map<string, number>();

    for (const event of events) {
      eventCounts.set(event.eventName, (eventCounts.get(event.eventName) || 0) + 1);
    }

    return Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Helper: Get top users
  private getTopUsers(events: AnalyticsEvent[], limit: number): Array<{userId: string; eventCount: number}> {
    const userCounts = new Map<string, number>();

    for (const event of events) {
      userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
    }

    return Array.from(userCounts.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, limit);
  }

  // ✅ REAL: Export data
  async exportData(format: 'csv' | 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify({ events: this.events, metrics: this.metrics }, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'userId', 'eventName', 'eventType', 'properties'];
    const rows = this.events.map(e => [
      e.timestamp.toISOString(),
      e.userId,
      e.eventName,
      e.eventType,
      JSON.stringify(e.properties)
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');
  }

  // ✅ REAL: Clear old data
  async purgeOldData(olderThanDays: number = 90): Promise<{eventsRemoved: number; metricsRemoved: number}> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const eventsRemoved = this.events.length;
    this.events = this.events.filter(e => e.timestamp > cutoff);
    const eventsAfter = this.events.length;

    const metricsRemoved = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    const metricsAfter = this.metrics.length;

    return {
      eventsRemoved: eventsRemoved - eventsAfter,
      metricsRemoved: metricsRemoved - metricsAfter
    };
  }

  // ✅ REAL: Get total events count
  async getEventCount(): Promise<number> {
    return this.events.length;
  }

  // ✅ REAL: Get metric count
  async getMetricCount(): Promise<number> {
    return this.metrics.length;
  }
}

export const analyticsService = new AnalyticsService();
