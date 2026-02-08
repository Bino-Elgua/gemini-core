import { hybridStorage } from './hybridStorageService';

interface AnalyticsDashboard {
  portfolioId: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    averageCTR: number;
    averageConversionRate: number;
    averageROI: number;
  };
  campaigns: CampaignAnalytics[];
  channels: ChannelAnalytics[];
  topAssets: AssetAnalytics[];
  trends: TrendData[];
  generatedAt: Date;
}

interface CampaignAnalytics {
  campaignId: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  revenue: number;
  roi: number;
}

interface ChannelAnalytics {
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  revenue: number;
}

interface AssetAnalytics {
  assetId: string;
  type: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  rank: number;
}

interface TrendData {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

class AnalyticsService {
  async trackEvent(portfolioId: string, event: {
    type: string;
    campaignId?: string;
    assetId?: string;
    channel?: string;
    revenue?: number;
    timestamp?: Date;
  }): Promise<void> {
    const eventRecord = {
      ...event,
      timestamp: event.timestamp || new Date(),
      portfolioId
    };

    const events = (await hybridStorage.get(`analytics-events-${portfolioId}`)) || [];
    events.push(eventRecord);
    await hybridStorage.set(`analytics-events-${portfolioId}`, events);

    console.log(`📊 Event tracked: ${event.type}`);
  }

  async recordImpression(portfolioId: string, campaignId: string, assetId: string, channel: string): Promise<void> {
    await this.trackEvent(portfolioId, {
      type: 'impression',
      campaignId,
      assetId,
      channel
    });
  }

  async recordClick(portfolioId: string, campaignId: string, assetId: string, channel: string): Promise<void> {
    await this.trackEvent(portfolioId, {
      type: 'click',
      campaignId,
      assetId,
      channel
    });
  }

  async recordConversion(portfolioId: string, campaignId: string, revenue: number): Promise<void> {
    await this.trackEvent(portfolioId, {
      type: 'conversion',
      campaignId,
      revenue
    });
  }

  async generateDashboard(portfolioId: string, days: number = 30): Promise<AnalyticsDashboard> {
    const events = (await hybridStorage.get(`analytics-events-${portfolioId}`)) || [];
    
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredEvents = events.filter((e: any) => new Date(e.timestamp) >= startDate);

    // Calculate metrics
    const impressions = filteredEvents.filter((e: any) => e.type === 'impression').length;
    const clicks = filteredEvents.filter((e: any) => e.type === 'click').length;
    const conversions = filteredEvents.filter((e: any) => e.type === 'conversion').length;
    const revenue = filteredEvents
      .filter((e: any) => e.type === 'conversion')
      .reduce((sum: number, e: any) => sum + (e.revenue || 0), 0);

    const dashboard: AnalyticsDashboard = {
      portfolioId,
      dateRange: { startDate, endDate: now },
      metrics: {
        totalImpressions: impressions,
        totalClicks: clicks,
        totalConversions: conversions,
        totalRevenue: revenue,
        averageCTR: impressions > 0 ? (clicks / impressions) * 100 : 0,
        averageConversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        averageROI: revenue > 0 ? ((revenue - (impressions * 0.001)) / (impressions * 0.001)) * 100 : 0
      },
      campaigns: this.calculateCampaignMetrics(filteredEvents),
      channels: this.calculateChannelMetrics(filteredEvents),
      topAssets: this.calculateAssetMetrics(filteredEvents),
      trends: this.calculateTrends(filteredEvents, days),
      generatedAt: new Date()
    };

    // Store dashboard snapshot
    await hybridStorage.set(`analytics-dashboard-${portfolioId}-${days}d`, dashboard);

    console.log(`📊 Analytics dashboard generated for ${days} days`);
    return dashboard;
  }

  private calculateCampaignMetrics(events: any[]): CampaignAnalytics[] {
    const campaignMap: Record<string, CampaignAnalytics> = {};

    for (const event of events) {
      if (!event.campaignId) continue;

      if (!campaignMap[event.campaignId]) {
        campaignMap[event.campaignId] = {
          campaignId: event.campaignId,
          name: event.campaignId,
          status: 'active',
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          conversionRate: 0,
          revenue: 0,
          roi: 0
        };
      }

      const campaign = campaignMap[event.campaignId];

      if (event.type === 'impression') campaign.impressions++;
      if (event.type === 'click') campaign.clicks++;
      if (event.type === 'conversion') {
        campaign.conversions++;
        campaign.revenue += event.revenue || 0;
      }
    }

    // Calculate derived metrics
    for (const campaign of Object.values(campaignMap)) {
      campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
      campaign.conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
      campaign.roi = campaign.revenue > 0 ? ((campaign.revenue - (campaign.impressions * 0.001)) / (campaign.impressions * 0.001)) * 100 : 0;
    }

    return Object.values(campaignMap).sort((a, b) => b.revenue - a.revenue);
  }

  private calculateChannelMetrics(events: any[]): ChannelAnalytics[] {
    const channelMap: Record<string, ChannelAnalytics> = {};

    for (const event of events) {
      const channel = event.channel || 'direct';

      if (!channelMap[channel]) {
        channelMap[channel] = {
          channel,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          conversionRate: 0,
          revenue: 0
        };
      }

      const ch = channelMap[channel];

      if (event.type === 'impression') ch.impressions++;
      if (event.type === 'click') ch.clicks++;
      if (event.type === 'conversion') {
        ch.conversions++;
        ch.revenue += event.revenue || 0;
      }
    }

    // Calculate derived metrics
    for (const ch of Object.values(channelMap)) {
      ch.ctr = ch.impressions > 0 ? (ch.clicks / ch.impressions) * 100 : 0;
      ch.conversionRate = ch.clicks > 0 ? (ch.conversions / ch.clicks) * 100 : 0;
    }

    return Object.values(channelMap).sort((a, b) => b.revenue - a.revenue);
  }

  private calculateAssetMetrics(events: any[]): AssetAnalytics[] {
    const assetMap: Record<string, AssetAnalytics> = {};

    for (const event of events) {
      if (!event.assetId) continue;

      if (!assetMap[event.assetId]) {
        assetMap[event.assetId] = {
          assetId: event.assetId,
          type: event.type,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0,
          conversionRate: 0,
          rank: 0
        };
      }

      const asset = assetMap[event.assetId];

      if (event.type === 'impression') asset.impressions++;
      if (event.type === 'click') asset.clicks++;
      if (event.type === 'conversion') asset.conversions++;
    }

    // Calculate derived metrics and rank
    const assets = Object.values(assetMap);
    assets.forEach(asset => {
      asset.ctr = asset.impressions > 0 ? (asset.clicks / asset.impressions) * 100 : 0;
      asset.conversionRate = asset.clicks > 0 ? (asset.conversions / asset.clicks) * 100 : 0;
    });

    return assets.sort((a, b) => b.conversions - a.conversions).map((asset, idx) => {
      asset.rank = idx + 1;
      return asset;
    });
  }

  private calculateTrends(events: any[], days: number): TrendData[] {
    const trendMap: Record<string, TrendData> = {};

    for (const event of events) {
      const date = new Date(event.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (!trendMap[dateKey]) {
        trendMap[dateKey] = {
          date: new Date(dateKey),
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0
        };
      }

      const trend = trendMap[dateKey];

      if (event.type === 'impression') trend.impressions++;
      if (event.type === 'click') trend.clicks++;
      if (event.type === 'conversion') {
        trend.conversions++;
        trend.revenue += event.revenue || 0;
      }
    }

    return Object.values(trendMap)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-days);
  }

  async getDashboard(portfolioId: string, days: number = 30): Promise<AnalyticsDashboard | null> {
    return await hybridStorage.get(`analytics-dashboard-${portfolioId}-${days}d`);
  }

  async clearEvents(portfolioId: string): Promise<void> {
    await hybridStorage.remove(`analytics-events-${portfolioId}`);
    console.log(`✅ Events cleared for portfolio`);
  }
}

export const analyticsService = new AnalyticsService();
