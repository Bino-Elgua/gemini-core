// Multi-Tenant Service - Tenant isolation, custom domains, white-label
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  customDomain?: string;
  owner: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  tenantId: string;
  branding: {
    logo?: string;
    favicon?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  features: {
    api: boolean;
    webhooks: boolean;
    sso: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
    advancedAnalytics: boolean;
    teamCollaboration: boolean;
  };
  storage: {
    maxGB: number;
    usedGB: number;
  };
  limits: {
    portfolios: number;
    campaigns: number;
    teamMembers: number;
    apiRequests: number;
  };
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  expiresAt: Date;
  acceptedAt?: Date;
  token: string;
}

class MultiTenantService {
  private tenants: Map<string, Tenant> = new Map();
  private tenantSettings: Map<string, TenantSettings> = new Map();
  private tenantInvitations: Map<string, TenantInvitation> = new Map();
  private tenantContext: string | null = null; // Current tenant context

  async initialize(): Promise<void> {
    // Initialize tenant system
  }

  async createTenant(
    name: string,
    slug: string,
    owner: string,
    plan: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<Tenant> {
    if (this.getTenantBySlug(slug)) {
      throw new Error(`Tenant with slug ${slug} already exists`);
    }

    const tenant: Tenant = {
      id: `tenant_${Date.now()}`,
      name,
      slug,
      owner,
      plan,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tenants.set(tenant.id, tenant);
    this.initializeTenantSettings(tenant.id, plan);
    return tenant;
  }

  private initializeTenantSettings(tenantId: string, plan: string): void {
    const planLimits = {
      free: {
        portfolios: 1,
        campaigns: 5,
        teamMembers: 1,
        apiRequests: 1000,
        maxGB: 5
      },
      pro: {
        portfolios: 10,
        campaigns: 50,
        teamMembers: 5,
        apiRequests: 100000,
        maxGB: 100
      },
      enterprise: {
        portfolios: -1,
        campaigns: -1,
        teamMembers: -1,
        apiRequests: -1,
        maxGB: -1
      }
    };

    const limits = planLimits[plan as keyof typeof planLimits] || planLimits.free;

    const settings: TenantSettings = {
      tenantId,
      branding: {
        colors: {
          primary: '#3B82F6',
          secondary: '#1E40AF',
          accent: '#F59E0B'
        }
      },
      features: {
        api: plan !== 'free',
        webhooks: plan !== 'free',
        sso: plan === 'enterprise',
        customDomain: plan === 'enterprise',
        whiteLabel: plan === 'enterprise',
        advancedAnalytics: plan !== 'free',
        teamCollaboration: plan !== 'free'
      },
      storage: {
        maxGB: limits.maxGB as number,
        usedGB: 0
      },
      limits: {
        portfolios: limits.portfolios as number,
        campaigns: limits.campaigns as number,
        teamMembers: limits.teamMembers as number,
        apiRequests: limits.apiRequests as number
      }
    };

    this.tenantSettings.set(tenantId, settings);
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return this.tenants.get(tenantId) || null;
  }

  private getTenantBySlug(slug: string): Tenant | undefined {
    return Array.from(this.tenants.values()).find(t => t.slug === slug);
  }

  async getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.tenantSettings.get(tenantId) || null;
  }

  async updateTenantSettings(
    tenantId: string,
    updates: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    const settings = this.tenantSettings.get(tenantId);
    if (!settings) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const updated = { ...settings, ...updates };
    this.tenantSettings.set(tenantId, updated);
    return updated;
  }

  async setTenantContext(tenantId: string): Promise<void> {
    if (!this.tenants.has(tenantId)) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    this.tenantContext = tenantId;
  }

  async getTenantContext(): Promise<string | null> {
    return this.tenantContext;
  }

  async inviteUserToTenant(
    tenantId: string,
    email: string,
    role: string
  ): Promise<TenantInvitation> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const settings = this.tenantSettings.get(tenantId);
    if (settings && settings.limits.teamMembers > 0) {
      // Check if limit reached
    }

    const invitation: TenantInvitation = {
      id: `invite_${Date.now()}`,
      tenantId,
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      token: this.generateInviteToken()
    };

    this.tenantInvitations.set(invitation.id, invitation);
    return invitation;
  }

  async acceptInvitation(inviteToken: string): Promise<void> {
    for (const [id, invitation] of this.tenantInvitations.entries()) {
      if (invitation.token === inviteToken) {
        if (invitation.expiresAt < new Date()) {
          throw new Error('Invitation expired');
        }
        invitation.acceptedAt = new Date();
        this.tenantInvitations.set(id, invitation);
        return;
      }
    }
    throw new Error('Invalid invitation token');
  }

  async setupCustomDomain(
    tenantId: string,
    domain: string
  ): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const settings = this.tenantSettings.get(tenantId);
    if (settings && !settings.features.customDomain) {
      throw new Error('Custom domain not available on this plan');
    }

    tenant.customDomain = domain;
    tenant.updatedAt = new Date();
    this.tenants.set(tenantId, tenant);
    return tenant;
  }

  async upgradeTenantPlan(
    tenantId: string,
    newPlan: 'free' | 'pro' | 'enterprise'
  ): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    tenant.plan = newPlan;
    tenant.updatedAt = new Date();
    this.tenants.set(tenantId, tenant);
    
    // Reset settings based on new plan
    this.initializeTenantSettings(tenantId, newPlan);

    return tenant;
  }

  async enableWhiteLabel(tenantId: string): Promise<void> {
    const settings = this.tenantSettings.get(tenantId);
    if (!settings) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    if (!settings.features.whiteLabel) {
      throw new Error('White-label not available on this plan');
    }

    settings.features.whiteLabel = true;
    this.tenantSettings.set(tenantId, settings);
  }

  async getTenantUsageStats(tenantId: string): Promise<{
    portfolios: number;
    campaigns: number;
    teamMembers: number;
    storageUsed: number;
    apiCallsThisMonth: number;
  }> {
    const settings = this.tenantSettings.get(tenantId);
    if (!settings) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    return {
      portfolios: 0, // Would be populated from database
      campaigns: 0,
      teamMembers: 0,
      storageUsed: settings.storage.usedGB,
      apiCallsThisMonth: 0
    };
  }

  private generateInviteToken(): string {
    return `invite_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
  }

  async listTenants(ownerId: string): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).filter(t => t.owner === ownerId);
  }

  async disableTenant(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (tenant) {
      tenant.isActive = false;
      tenant.updatedAt = new Date();
      this.tenants.set(tenantId, tenant);
    }
  }
}

export const multiTenantService = new MultiTenantService();
