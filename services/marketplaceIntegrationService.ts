// Marketplace Integration Service - Zapier, Make, Integromat connectors
export interface MarketplaceIntegration {
  id: string;
  name: string;
  platform: 'zapier' | 'make' | 'integromat' | 'n8n' | 'ifttt';
  authentication: {
    apiKey?: string;
    webhookUrl?: string;
    oauthToken?: string;
  };
  enabled: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
  config: Record<string, unknown>;
}

export interface Webhook {
  id: string;
  url: string;
  event: string;
  active: boolean;
  createdAt: Date;
  triggers: string[];
}

export interface IntegrationMapping {
  id: string;
  integrationId: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
}

class MarketplaceIntegrationService {
  private integrations: Map<string, MarketplaceIntegration> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private mappings: Map<string, IntegrationMapping> = new Map();
  private syncHistory: Array<{
    integrationId: string;
    timestamp: Date;
    status: 'success' | 'failure';
    recordsProcessed: number;
    error?: string;
  }> = [];

  async initialize(): Promise<void> {
    // Initialize marketplace integrations
  }

  async setupZapierIntegration(
    portfolioId: string,
    apiKey: string
  ): Promise<MarketplaceIntegration> {
    const integration: MarketplaceIntegration = {
      id: `zapier_${portfolioId}`,
      name: 'Zapier',
      platform: 'zapier',
      authentication: { apiKey },
      enabled: true,
      connectedAt: new Date(),
      config: {
        portfolioId,
        webhookEvents: ['campaign_created', 'lead_scored', 'email_sent']
      }
    };

    this.integrations.set(integration.id, integration);
    return integration;
  }

  async setupMakeIntegration(
    portfolioId: string,
    webhookUrl: string
  ): Promise<MarketplaceIntegration> {
    const integration: MarketplaceIntegration = {
      id: `make_${portfolioId}`,
      name: 'Make (Integromat)',
      platform: 'make',
      authentication: { webhookUrl },
      enabled: true,
      connectedAt: new Date(),
      config: {
        portfolioId,
        autoSync: true,
        syncInterval: 3600 // seconds
      }
    };

    this.integrations.set(integration.id, integration);
    return integration;
  }

  async setupN8nIntegration(
    portfolioId: string,
    webhookUrl: string,
    apiKey: string
  ): Promise<MarketplaceIntegration> {
    const integration: MarketplaceIntegration = {
      id: `n8n_${portfolioId}`,
      name: 'n8n',
      platform: 'n8n',
      authentication: { webhookUrl, apiKey },
      enabled: true,
      connectedAt: new Date(),
      config: {
        portfolioId,
        workflows: ['lead_enrichment', 'campaign_optimization']
      }
    };

    this.integrations.set(integration.id, integration);
    return integration;
  }

  async createFieldMapping(
    integrationId: string,
    sourceField: string,
    targetField: string,
    transformation?: string
  ): Promise<IntegrationMapping> {
    const mapping: IntegrationMapping = {
      id: `mapping_${Date.now()}`,
      integrationId,
      sourceField,
      targetField,
      transformation
    };

    this.mappings.set(mapping.id, mapping);
    return mapping;
  }

  async registerWebhook(
    integrationId: string,
    event: string,
    webhookUrl: string,
    triggers: string[] = []
  ): Promise<Webhook> {
    const webhook: Webhook = {
      id: `webhook_${Date.now()}`,
      url: webhookUrl,
      event,
      active: true,
      createdAt: new Date(),
      triggers
    };

    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  async triggerWebhook(
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values()).filter(
      w => w.event === event && w.active
    );

    for (const webhook of relevantWebhooks) {
      try {
        // In production, make actual HTTP POST request
        await this.sendWebhookPayload(webhook.url, data);
      } catch (error) {
        console.error(`Failed to send webhook to ${webhook.url}:`, error);
      }
    }
  }

  private async sendWebhookPayload(
    url: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Mock webhook delivery
    // In production: await fetch(url, { method: 'POST', body: JSON.stringify(data) })
  }

  async syncIntegration(integrationId: string): Promise<{
    status: 'success' | 'failure';
    recordsProcessed: number;
    error?: string;
  }> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    try {
      // Mock sync process
      const recordsProcessed = Math.floor(Math.random() * 1000);

      integration.lastSyncAt = new Date();
      this.integrations.set(integrationId, integration);

      this.syncHistory.push({
        integrationId,
        timestamp: new Date(),
        status: 'success',
        recordsProcessed
      });

      return { status: 'success', recordsProcessed };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.syncHistory.push({
        integrationId,
        timestamp: new Date(),
        status: 'failure',
        recordsProcessed: 0,
        error: errorMsg
      });

      return { status: 'failure', recordsProcessed: 0, error: errorMsg };
    }
  }

  async getIntegration(integrationId: string): Promise<MarketplaceIntegration | null> {
    return this.integrations.get(integrationId) || null;
  }

  async listIntegrations(portfolioId: string): Promise<MarketplaceIntegration[]> {
    return Array.from(this.integrations.values()).filter(
      i => (i.config.portfolioId as string) === portfolioId
    );
  }

  async disconnectIntegration(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.enabled = false;
      this.integrations.set(integrationId, integration);
    }
  }

  async getFieldMappings(integrationId: string): Promise<IntegrationMapping[]> {
    return Array.from(this.mappings.values()).filter(
      m => m.integrationId === integrationId
    );
  }

  async updateFieldMapping(
    mappingId: string,
    updates: Partial<IntegrationMapping>
  ): Promise<IntegrationMapping> {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      throw new Error(`Mapping ${mappingId} not found`);
    }

    const updated = { ...mapping, ...updates };
    this.mappings.set(mappingId, updated);
    return updated;
  }

  async deleteFieldMapping(mappingId: string): Promise<void> {
    this.mappings.delete(mappingId);
  }

  async getSyncHistory(
    integrationId: string,
    limit: number = 50
  ): Promise<typeof this.syncHistory> {
    return this.syncHistory
      .filter(h => h.integrationId === integrationId)
      .slice(-limit);
  }

  async getWebhook(webhookId: string): Promise<Webhook | null> {
    return this.webhooks.get(webhookId) || null;
  }

  async updateWebhook(
    webhookId: string,
    updates: Partial<Webhook>
  ): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const updated = { ...webhook, ...updates };
    this.webhooks.set(webhookId, updated);
    return updated;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    this.webhooks.delete(webhookId);
  }

  async testIntegrationConnection(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    try {
      // Mock connection test
      return true;
    } catch {
      return false;
    }
  }

  async getIntegrationPresets(): Promise<Record<string, unknown>[]> {
    return [
      {
        name: 'Zapier - Lead Management',
        platform: 'zapier',
        description: 'Auto-sync leads to CRM via Zapier'
      },
      {
        name: 'Make - Email Sequences',
        platform: 'make',
        description: 'Trigger email sequences with Make workflows'
      },
      {
        name: 'n8n - Data Enrichment',
        platform: 'n8n',
        description: 'Enrich lead data with n8n workflows'
      }
    ];
  }
}

export const marketplaceIntegrationService = new MarketplaceIntegrationService();
