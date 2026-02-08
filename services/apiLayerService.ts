// API Layer Service - REST & GraphQL endpoints for third-party integration
import type { Campaign, Asset, Lead, TeamMember, Portfolio } from '../types-extended';

export interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  authentication: 'api-key' | 'oauth2' | 'jwt' | 'bearer';
  rateLimit: number; // requests per minute
  version: string;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  secret?: string;
  portfolioId: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface GraphQLSchema {
  queries: string[];
  mutations: string[];
  subscriptions: string[];
}

class APILayerService {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private requestLogs: Array<{
    timestamp: Date;
    endpoint: string;
    method: string;
    status: number;
    duration: number;
  }> = [];

  async initialize(): Promise<void> {
    this.setupRESTEndpoints();
    this.setupGraphQLSchema();
  }

  private setupRESTEndpoints(): void {
    const restEndpoints: APIEndpoint[] = [
      // Portfolio endpoints
      {
        id: 'get-portfolio',
        method: 'GET',
        path: '/api/v1/portfolios/:id',
        description: 'Get portfolio by ID',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      },
      {
        id: 'list-portfolios',
        method: 'GET',
        path: '/api/v1/portfolios',
        description: 'List all portfolios',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      },
      {
        id: 'create-portfolio',
        method: 'POST',
        path: '/api/v1/portfolios',
        description: 'Create new portfolio',
        authentication: 'bearer',
        rateLimit: 50,
        version: 'v1'
      },
      // Campaign endpoints
      {
        id: 'get-campaign',
        method: 'GET',
        path: '/api/v1/campaigns/:id',
        description: 'Get campaign by ID',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      },
      {
        id: 'list-campaigns',
        method: 'GET',
        path: '/api/v1/campaigns',
        description: 'List campaigns',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      },
      {
        id: 'create-campaign',
        method: 'POST',
        path: '/api/v1/campaigns',
        description: 'Create campaign',
        authentication: 'bearer',
        rateLimit: 50,
        version: 'v1'
      },
      {
        id: 'update-campaign',
        method: 'PUT',
        path: '/api/v1/campaigns/:id',
        description: 'Update campaign',
        authentication: 'bearer',
        rateLimit: 50,
        version: 'v1'
      },
      {
        id: 'delete-campaign',
        method: 'DELETE',
        path: '/api/v1/campaigns/:id',
        description: 'Delete campaign',
        authentication: 'bearer',
        rateLimit: 50,
        version: 'v1'
      },
      // Lead endpoints
      {
        id: 'get-lead',
        method: 'GET',
        path: '/api/v1/leads/:id',
        description: 'Get lead by ID',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      },
      {
        id: 'list-leads',
        method: 'GET',
        path: '/api/v1/leads',
        description: 'List leads',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      },
      {
        id: 'create-lead',
        method: 'POST',
        path: '/api/v1/leads',
        description: 'Create lead',
        authentication: 'bearer',
        rateLimit: 50,
        version: 'v1'
      },
      // Analytics endpoints
      {
        id: 'get-analytics',
        method: 'GET',
        path: '/api/v1/analytics/:portfolioId',
        description: 'Get analytics',
        authentication: 'bearer',
        rateLimit: 100,
        version: 'v1'
      }
    ];

    restEndpoints.forEach(ep => this.endpoints.set(ep.id, ep));
  }

  private setupGraphQLSchema(): GraphQLSchema {
    return {
      queries: [
        'portfolio(id: ID!): Portfolio',
        'portfolios(limit: Int, offset: Int): [Portfolio]',
        'campaign(id: ID!): Campaign',
        'campaigns(portfolioId: ID!, status: String): [Campaign]',
        'lead(id: ID!): Lead',
        'leads(portfolioId: ID!, status: String): [Lead]',
        'analytics(portfolioId: ID!, period: String): Analytics'
      ],
      mutations: [
        'createPortfolio(input: PortfolioInput!): Portfolio',
        'updatePortfolio(id: ID!, input: PortfolioInput!): Portfolio',
        'deletePortfolio(id: ID!): Boolean',
        'createCampaign(input: CampaignInput!): Campaign',
        'updateCampaign(id: ID!, input: CampaignInput!): Campaign',
        'createLead(input: LeadInput!): Lead',
        'updateLead(id: ID!, input: LeadInput!): Lead'
      ],
      subscriptions: [
        'onCampaignUpdate(campaignId: ID!): Campaign',
        'onLeadUpdate(leadId: ID!): Lead',
        'onAnalyticsUpdate(portfolioId: ID!): Analytics'
      ]
    };
  }

  async createAPIKey(
    portfolioId: string,
    name: string,
    permissions: string[]
  ): Promise<APIKey> {
    const key = this.generateSecureKey();
    const apiKey: APIKey = {
      id: `key_${Date.now()}`,
      name,
      key,
      portfolioId,
      permissions,
      createdAt: new Date(),
      isActive: true
    };
    this.apiKeys.set(apiKey.id, apiKey);
    return apiKey;
  }

  async validateAPIKey(key: string): Promise<APIKey | null> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.key === key && apiKey.isActive) {
        apiKey.lastUsed = new Date();
        return apiKey;
      }
    }
    return null;
  }

  async revokeAPIKey(keyId: string): Promise<void> {
    const key = this.apiKeys.get(keyId);
    if (key) {
      key.isActive = false;
    }
  }

  async logRequest(
    endpoint: string,
    method: string,
    status: number,
    duration: number
  ): Promise<void> {
    this.requestLogs.push({
      timestamp: new Date(),
      endpoint,
      method,
      status,
      duration
    });
    // Keep only last 10000 logs
    if (this.requestLogs.length > 10000) {
      this.requestLogs = this.requestLogs.slice(-10000);
    }
  }

  async getRequestLogs(
    endpoint?: string,
    limit: number = 100
  ): Promise<typeof this.requestLogs> {
    let logs = this.requestLogs;
    if (endpoint) {
      logs = logs.filter(log => log.endpoint.includes(endpoint));
    }
    return logs.slice(-limit);
  }

  async getRateLimitStatus(apiKeyId: string): Promise<{
    limit: number;
    remaining: number;
    resetAt: Date;
  }> {
    const key = this.apiKeys.get(apiKeyId);
    if (!key) {
      throw new Error('API key not found');
    }

    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentRequests = this.requestLogs.filter(
      log => log.timestamp > oneMinuteAgo
    ).length;

    return {
      limit: 1000,
      remaining: Math.max(0, 1000 - recentRequests),
      resetAt: new Date(Date.now() + 60000)
    };
  }

  private generateSecureKey(): string {
    return `sk_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
  }

  async getEndpoints(): Promise<APIEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async getGraphQLSchema(): Promise<GraphQLSchema> {
    return this.setupGraphQLSchema();
  }
}

export const apiLayerService = new APILayerService();
