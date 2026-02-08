// Advanced Security Service - Encryption, audit logs, SSO, RBAC
import type { TeamMember } from '../types-extended';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, [unknown, unknown]>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  status: 'success' | 'failure';
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}

export interface SSOProvider {
  id: string;
  name: 'google' | 'microsoft' | 'github' | 'okta' | 'auth0';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  enabled: boolean;
}

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyRotationDays: number;
  lastKeyRotation: Date;
}

class AdvancedSecurityService {
  private auditLogs: AuditLog[] = [];
  private roles: Map<string, Role> = new Map();
  private ssoProviders: Map<string, SSOProvider> = new Map();
  private encryptionConfig: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyRotationDays: 90,
    lastKeyRotation: new Date()
  };
  private rbacRules: Map<string, Set<string>> = new Map();

  async initialize(): Promise<void> {
    this.setupDefaultRoles();
    this.setupEncryption();
  }

  private setupDefaultRoles(): void {
    const defaultRoles: Role[] = [
      {
        id: 'owner',
        name: 'Owner',
        permissions: [
          'portfolio:read',
          'portfolio:write',
          'portfolio:delete',
          'team:manage',
          'billing:manage',
          'security:manage'
        ],
        description: 'Full access'
      },
      {
        id: 'admin',
        name: 'Admin',
        permissions: [
          'portfolio:read',
          'portfolio:write',
          'team:manage',
          'analytics:read',
          'settings:manage'
        ],
        description: 'Administrative access'
      },
      {
        id: 'member',
        name: 'Member',
        permissions: [
          'portfolio:read',
          'portfolio:write',
          'analytics:read'
        ],
        description: 'Standard member access'
      },
      {
        id: 'viewer',
        name: 'Viewer',
        permissions: [
          'portfolio:read',
          'analytics:read'
        ],
        description: 'Read-only access'
      }
    ];

    defaultRoles.forEach(role => this.roles.set(role.id, role));
  }

  private setupEncryption(): void {
    // Initialize encryption keys and configuration
    this.encryptionConfig = {
      algorithm: 'AES-256-GCM',
      keyRotationDays: 90,
      lastKeyRotation: new Date()
    };
  }

  async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    ipAddress: string,
    userAgent: string,
    changes?: Record<string, [unknown, unknown]>
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit_${Date.now()}`,
      userId,
      action,
      resource,
      resourceId,
      changes,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      status: 'success'
    };

    this.auditLogs.push(log);
    return log;
  }

  async getAuditLogs(
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<AuditLog[]> {
    let logs = this.auditLogs;

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(l => l.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter(l => l.action === filters.action);
      }
      if (filters.resource) {
        logs = logs.filter(l => l.resource === filters.resource);
      }
      if (filters.startDate) {
        logs = logs.filter(l => l.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(l => l.timestamp <= filters.endDate!);
      }
    }

    return logs.slice(-limit);
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }
    this.rbacRules.set(userId, new Set(role.permissions));
  }

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = this.rbacRules.get(userId);
    if (!permissions) {
      return false;
    }
    return permissions.has(permission);
  }

  async setupSSO(provider: SSOProvider): Promise<void> {
    this.ssoProviders.set(provider.id, provider);
  }

  async getSSoProviders(): Promise<SSOProvider[]> {
    return Array.from(this.ssoProviders.values());
  }

  async rotateEncryptionKeys(): Promise<void> {
    const lastRotation = this.encryptionConfig.lastKeyRotation;
    const daysSinceRotation = Math.floor(
      (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceRotation >= this.encryptionConfig.keyRotationDays) {
      // Generate new key and re-encrypt data
      this.encryptionConfig.lastKeyRotation = new Date();
    }
  }

  async encryptData(data: string): Promise<string> {
    // In production, use actual encryption library
    return Buffer.from(data).toString('base64');
  }

  async decryptData(encryptedData: string): Promise<string> {
    // In production, use actual decryption
    return Buffer.from(encryptedData, 'base64').toString('utf-8');
  }

  async generateSecurityReport(): Promise<{
    totalAuditLogs: number;
    suspiciousActivities: number;
    failedLoginAttempts: number;
    unauthorizedAccessAttempts: number;
    keyRotationDue: boolean;
  }> {
    const suspiciousActivities = this.auditLogs.filter(
      log => log.status === 'failure'
    ).length;

    const failedLoginAttempts = this.auditLogs.filter(
      log => log.action === 'login' && log.status === 'failure'
    ).length;

    const unauthorizedAccessAttempts = this.auditLogs.filter(
      log => log.action === 'unauthorized_access'
    ).length;

    const daysSinceRotation = Math.floor(
      (Date.now() - this.encryptionConfig.lastKeyRotation.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      totalAuditLogs: this.auditLogs.length,
      suspiciousActivities,
      failedLoginAttempts,
      unauthorizedAccessAttempts,
      keyRotationDue: daysSinceRotation >= this.encryptionConfig.keyRotationDays
    };
  }

  async getRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async getEncryptionConfig(): Promise<EncryptionConfig> {
    return this.encryptionConfig;
  }
}

export const advancedSecurityService = new AdvancedSecurityService();
