// Integration Marketplace Service - Third-party app store, plugin system
export interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  rating: number;
  downloads: number;
  price: 'free' | 'paid';
  installationUrl: string;
  documentationUrl: string;
  tags: string[];
  permissions: string[];
  createdAt: Date;
}

export interface InstalledApp {
  id: string;
  appId: string;
  portfolioId: string;
  config: Record<string, unknown>;
  enabled: boolean;
  installedAt: Date;
  lastUpdated: Date;
}

export interface AppPermission {
  permission: string;
  description: string;
  category: 'data' | 'actions' | 'integrations' | 'system';
}

class IntegrationMarketplaceService {
  private marketplaceApps: Map<string, MarketplaceApp> = new Map();
  private installedApps: Map<string, InstalledApp> = new Map();
  private appPermissions: Map<string, AppPermission> = new Map();
  private reviews: Array<{
    appId: string;
    userId: string;
    rating: number;
    comment: string;
    timestamp: Date;
  }> = [];

  async initialize(): Promise<void> {
    this.populateMarketplace();
    this.setupPermissions();
  }

  private populateMarketplace(): void {
    const apps: MarketplaceApp[] = [
      {
        id: 'app_slack',
        name: 'Slack Integration',
        description: 'Send campaign updates to Slack',
        category: 'communications',
        version: '1.0.0',
        author: 'Sacred Core',
        rating: 4.8,
        downloads: 2500,
        price: 'free',
        installationUrl: 'https://slack.com/oauth/v2/authorize',
        documentationUrl: 'https://docs.sacred-core.com/slack',
        tags: ['slack', 'notifications', 'chat'],
        permissions: ['read:campaigns', 'send:messages'],
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'app_hubspot',
        name: 'HubSpot CRM',
        description: 'Sync leads to HubSpot CRM',
        category: 'crm',
        version: '2.1.0',
        author: 'HubSpot',
        rating: 4.9,
        downloads: 5000,
        price: 'free',
        installationUrl: 'https://hubspot.com/oauth/authorize',
        documentationUrl: 'https://docs.sacred-core.com/hubspot',
        tags: ['hubspot', 'crm', 'leads'],
        permissions: ['read:leads', 'write:contacts'],
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'app_stripe',
        name: 'Stripe Payments',
        description: 'Accept payments with Stripe',
        category: 'payments',
        version: '1.5.0',
        author: 'Stripe',
        rating: 4.7,
        downloads: 3000,
        price: 'free',
        installationUrl: 'https://stripe.com/oauth/authorize',
        documentationUrl: 'https://docs.sacred-core.com/stripe',
        tags: ['stripe', 'payments', 'checkout'],
        permissions: ['read:transactions', 'write:charges'],
        createdAt: new Date('2024-02-01')
      },
      {
        id: 'app_gtm',
        name: 'Google Tag Manager',
        description: 'Track campaigns with GTM',
        category: 'analytics',
        version: '1.2.0',
        author: 'Google',
        rating: 4.6,
        downloads: 4200,
        price: 'free',
        installationUrl: 'https://tagmanager.google.com/oauth/authorize',
        documentationUrl: 'https://docs.sacred-core.com/gtm',
        tags: ['google', 'analytics', 'tracking'],
        permissions: ['write:events', 'read:analytics'],
        createdAt: new Date('2024-01-20')
      }
    ];

    apps.forEach(app => this.marketplaceApps.set(app.id, app));
  }

  private setupPermissions(): void {
    const permissions: AppPermission[] = [
      { permission: 'read:campaigns', description: 'Read campaign data', category: 'data' },
      { permission: 'write:campaigns', description: 'Modify campaigns', category: 'actions' },
      { permission: 'read:leads', description: 'Read lead information', category: 'data' },
      { permission: 'write:contacts', description: 'Create/update contacts', category: 'data' },
      { permission: 'send:messages', description: 'Send messages', category: 'actions' },
      { permission: 'read:analytics', description: 'Access analytics', category: 'data' },
      { permission: 'write:events', description: 'Log events', category: 'integrations' },
      { permission: 'read:transactions', description: 'View transactions', category: 'data' },
      { permission: 'write:charges', description: 'Create charges', category: 'actions' }
    ];

    permissions.forEach(p => this.appPermissions.set(p.permission, p));
  }

  async listMarketplaceApps(
    category?: string,
    search?: string
  ): Promise<MarketplaceApp[]> {
    let apps = Array.from(this.marketplaceApps.values());

    if (category) {
      apps = apps.filter(a => a.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      apps = apps.filter(
        a => a.name.toLowerCase().includes(searchLower) ||
             a.description.toLowerCase().includes(searchLower) ||
             a.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    return apps.sort((a, b) => b.rating - a.rating);
  }

  async getMarketplaceApp(appId: string): Promise<MarketplaceApp | null> {
    return this.marketplaceApps.get(appId) || null;
  }

  async installApp(
    appId: string,
    portfolioId: string,
    config: Record<string, unknown> = {}
  ): Promise<InstalledApp> {
    const app = this.marketplaceApps.get(appId);
    if (!app) {
      throw new Error(`App ${appId} not found`);
    }

    const installed: InstalledApp = {
      id: `installed_${Date.now()}`,
      appId,
      portfolioId,
      config,
      enabled: true,
      installedAt: new Date(),
      lastUpdated: new Date()
    };

    this.installedApps.set(installed.id, installed);
    return installed;
  }

  async uninstallApp(installedId: string): Promise<void> {
    this.installedApps.delete(installedId);
  }

  async getInstalledApps(portfolioId: string): Promise<InstalledApp[]> {
    return Array.from(this.installedApps.values()).filter(
      a => a.portfolioId === portfolioId
    );
  }

  async enableApp(installedId: string): Promise<void> {
    const app = this.installedApps.get(installedId);
    if (app) {
      app.enabled = true;
      this.installedApps.set(installedId, app);
    }
  }

  async disableApp(installedId: string): Promise<void> {
    const app = this.installedApps.get(installedId);
    if (app) {
      app.enabled = false;
      this.installedApps.set(installedId, app);
    }
  }

  async updateAppConfig(
    installedId: string,
    config: Record<string, unknown>
  ): Promise<InstalledApp> {
    const app = this.installedApps.get(installedId);
    if (!app) {
      throw new Error(`Installed app ${installedId} not found`);
    }

    app.config = config;
    app.lastUpdated = new Date();
    this.installedApps.set(installedId, app);
    return app;
  }

  async getAppPermissions(appId: string): Promise<AppPermission[]> {
    const app = this.marketplaceApps.get(appId);
    if (!app) {
      throw new Error(`App ${appId} not found`);
    }

    return app.permissions
      .map(p => this.appPermissions.get(p))
      .filter((p): p is AppPermission => p !== undefined);
  }

  async rateApp(
    appId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    this.reviews.push({
      appId,
      userId,
      rating,
      comment: comment || '',
      timestamp: new Date()
    });

    // Update app rating
    const app = this.marketplaceApps.get(appId);
    if (app) {
      const appReviews = this.reviews.filter(r => r.appId === appId);
      app.rating = appReviews.reduce((sum, r) => sum + r.rating, 0) / appReviews.length;
      this.marketplaceApps.set(appId, app);
    }
  }

  async getAppReviews(appId: string): Promise<typeof this.reviews> {
    return this.reviews.filter(r => r.appId === appId);
  }

  async getCategories(): Promise<string[]> {
    const categories = new Set<string>();
    for (const app of this.marketplaceApps.values()) {
      categories.add(app.category);
    }
    return Array.from(categories).sort();
  }

  async getFeaturedApps(): Promise<MarketplaceApp[]> {
    return Array.from(this.marketplaceApps.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 5);
  }

  async searchApps(query: string): Promise<MarketplaceApp[]> {
    return this.listMarketplaceApps(undefined, query);
  }

  async checkAppUpdates(installedId: string): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
  }> {
    const installed = this.installedApps.get(installedId);
    if (!installed) {
      throw new Error(`Installed app ${installedId} not found`);
    }

    const app = this.marketplaceApps.get(installed.appId);
    if (!app) {
      throw new Error(`App ${installed.appId} not found`);
    }

    return {
      hasUpdate: false, // Mock - would compare versions
      currentVersion: app.version,
      latestVersion: app.version
    };
  }

  async updateInstalledApp(installedId: string): Promise<void> {
    const app = this.installedApps.get(installedId);
    if (app) {
      app.lastUpdated = new Date();
      this.installedApps.set(installedId, app);
    }
  }
}

export const integrationMarketplaceService = new IntegrationMarketplaceService();
