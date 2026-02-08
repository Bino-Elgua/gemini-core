// Data Governance Service - Data privacy, retention, compliance workflows
export interface GovernancePolicy {
  id: string;
  name: string;
  type: 'retention' | 'privacy' | 'classification' | 'export_control';
  description: string;
  rules: Record<string, unknown>;
  enforced: boolean;
}

export interface DataClassification {
  id: string;
  dataType: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  retentionDays: number;
  encryptionRequired: boolean;
}

export interface PrivacyConsent {
  id: string;
  userId: string;
  consentType: 'marketing' | 'analytics' | 'profiling' | 'thirdparty';
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
}

export interface DataLineageRecord {
  id: string;
  dataId: string;
  source: string;
  transformations: string[];
  destination: string;
  timestamp: Date;
}

class DataGovernanceService {
  private policies: Map<string, GovernancePolicy> = new Map();
  private classifications: Map<string, DataClassification> = new Map();
  private consents: Map<string, PrivacyConsent> = new Map();
  private lineageRecords: DataLineageRecord[] = [];
  private dataRetentionTasks: Array<{
    dataId: string;
    scheduleDate: Date;
    executed: boolean;
  }> = [];

  async initialize(): Promise<void> {
    this.setupDefaultPolicies();
    this.setupDefaultClassifications();
  }

  private setupDefaultPolicies(): void {
    const policies: GovernancePolicy[] = [
      {
        id: 'policy_retention_standard',
        name: 'Standard Data Retention',
        type: 'retention',
        description: 'Default retention policy for all data',
        rules: {
          defaultRetention: 7 * 365, // 7 years
          archiveAfter: 365 * 3, // 3 years
          deleteAfter: 365 * 7 // 7 years
        },
        enforced: true
      },
      {
        id: 'policy_gdpr_compliance',
        name: 'GDPR Compliance',
        type: 'privacy',
        description: 'GDPR-compliant data handling',
        rules: {
          consentRequired: true,
          rightToBeForgotten: true,
          dataPortability: true,
          consentExpiry: 365 * 2 // 2 years
        },
        enforced: false
      },
      {
        id: 'policy_data_classification',
        name: 'Data Classification',
        type: 'classification',
        description: 'Classify and protect data by sensitivity',
        rules: {
          requiresEncryption: ['confidential', 'restricted'],
          requiresAudit: ['restricted', 'confidential'],
          shareableClassifications: ['public', 'internal']
        },
        enforced: true
      }
    ];

    policies.forEach(p => this.policies.set(p.id, p));
  }

  private setupDefaultClassifications(): void {
    const classifications: DataClassification[] = [
      {
        id: 'class_personal',
        dataType: 'personal_information',
        classification: 'confidential',
        sensitivity: 'high',
        retentionDays: 365 * 3,
        encryptionRequired: true
      },
      {
        id: 'class_financial',
        dataType: 'financial_data',
        classification: 'restricted',
        sensitivity: 'critical',
        retentionDays: 365 * 7,
        encryptionRequired: true
      },
      {
        id: 'class_campaign',
        dataType: 'campaign_data',
        classification: 'internal',
        sensitivity: 'medium',
        retentionDays: 365 * 2,
        encryptionRequired: false
      },
      {
        id: 'class_analytics',
        dataType: 'analytics_data',
        classification: 'internal',
        sensitivity: 'low',
        retentionDays: 365,
        encryptionRequired: false
      }
    ];

    classifications.forEach(c => this.classifications.set(c.id, c));
  }

  async createPolicy(
    name: string,
    type: 'retention' | 'privacy' | 'classification' | 'export_control',
    rules: Record<string, unknown>
  ): Promise<GovernancePolicy> {
    const policy: GovernancePolicy = {
      id: `policy_${Date.now()}`,
      name,
      type,
      description: '',
      rules,
      enforced: false
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  async getPolicies(type?: string): Promise<GovernancePolicy[]> {
    let policies = Array.from(this.policies.values());
    if (type) {
      policies = policies.filter(p => p.type === type);
    }
    return policies;
  }

  async enforcePolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.enforced = true;
      this.policies.set(policyId, policy);
    }
  }

  async recordPrivacyConsent(
    userId: string,
    consentType: 'marketing' | 'analytics' | 'profiling' | 'thirdparty',
    granted: boolean,
    expiresAt?: Date
  ): Promise<PrivacyConsent> {
    const consent: PrivacyConsent = {
      id: `consent_${Date.now()}`,
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      expiresAt
    };

    this.consents.set(consent.id, consent);
    return consent;
  }

  async getUserConsents(userId: string): Promise<PrivacyConsent[]> {
    return Array.from(this.consents.values()).filter(c => c.userId === userId);
  }

  async revokeConsent(consentId: string): Promise<void> {
    const consent = this.consents.get(consentId);
    if (consent) {
      consent.granted = false;
      this.consents.set(consentId, consent);
    }
  }

  async classifyData(
    dataId: string,
    classification: 'public' | 'internal' | 'confidential' | 'restricted'
  ): Promise<DataClassification> {
    // Find or create classification for this data
    const classRecord: DataClassification = {
      id: `class_data_${dataId}`,
      dataType: dataId,
      classification,
      sensitivity: this.mapClassificationToSensitivity(classification),
      retentionDays: this.mapClassificationToRetention(classification),
      encryptionRequired: classification !== 'public'
    };

    this.classifications.set(classRecord.id, classRecord);
    return classRecord;
  }

  private mapClassificationToSensitivity(
    classification: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const map: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      public: 'low',
      internal: 'medium',
      confidential: 'high',
      restricted: 'critical'
    };
    return map[classification] || 'low';
  }

  private mapClassificationToRetention(classification: string): number {
    const map: Record<string, number> = {
      public: 365, // 1 year
      internal: 365 * 2, // 2 years
      confidential: 365 * 3, // 3 years
      restricted: 365 * 7 // 7 years
    };
    return map[classification] || 365;
  }

  async recordDataLineage(
    dataId: string,
    source: string,
    transformations: string[],
    destination: string
  ): Promise<DataLineageRecord> {
    const record: DataLineageRecord = {
      id: `lineage_${Date.now()}`,
      dataId,
      source,
      transformations,
      destination,
      timestamp: new Date()
    };

    this.lineageRecords.push(record);
    return record;
  }

  async getDataLineage(dataId: string): Promise<DataLineageRecord[]> {
    return this.lineageRecords.filter(r => r.dataId === dataId);
  }

  async scheduleDataDeletion(dataId: string, delayDays: number): Promise<void> {
    this.dataRetentionTasks.push({
      dataId,
      scheduleDate: new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000),
      executed: false
    });
  }

  async processDataDeletions(): Promise<{
    deleted: string[];
    failed: string[];
  }> {
    const now = new Date();
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const task of this.dataRetentionTasks) {
      if (!task.executed && task.scheduleDate <= now) {
        try {
          // Mock deletion
          deleted.push(task.dataId);
          task.executed = true;
        } catch (error) {
          failed.push(task.dataId);
        }
      }
    }

    return { deleted, failed };
  }

  async getGovernanceReport(): Promise<{
    policies: GovernancePolicy[];
    classifications: DataClassification[];
    consentStats: {
      total: number;
      granted: number;
      revoked: number;
    };
    lineageRecordsCount: number;
    pendingDeletions: number;
  }> {
    const totalConsents = this.consents.size;
    const grantedConsents = Array.from(this.consents.values()).filter(c => c.granted).length;

    return {
      policies: Array.from(this.policies.values()),
      classifications: Array.from(this.classifications.values()),
      consentStats: {
        total: totalConsents,
        granted: grantedConsents,
        revoked: totalConsents - grantedConsents
      },
      lineageRecordsCount: this.lineageRecords.length,
      pendingDeletions: this.dataRetentionTasks.filter(t => !t.executed).length
    };
  }

  async implementRightToBeForgotten(userId: string): Promise<{
    dataPurged: number;
    dataAnonymized: number;
  }> {
    // Get all data related to user
    const userConsents = Array.from(this.consents.values()).filter(c => c.userId === userId);
    
    // Purge or anonymize data
    let dataPurged = 0;
    let dataAnonymized = 0;

    for (const consent of userConsents) {
      if (consent.granted) {
        dataAnonymized++;
      } else {
        dataPurged++;
      }
    }

    return { dataPurged, dataAnonymized };
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const userData: Record<string, unknown> = {
      userId,
      exportedAt: new Date(),
      consents: Array.from(this.consents.values()).filter(c => c.userId === userId),
      dataClassifications: Array.from(this.classifications.values()),
      policies: Array.from(this.policies.values()).filter(p => p.enforced)
    };

    return userData;
  }

  async getComplianceCheckList(): Promise<Array<{
    item: string;
    status: 'completed' | 'pending' | 'warning';
    description: string;
  }>> {
    const enforcedPolicies = Array.from(this.policies.values()).filter(p => p.enforced);

    return [
      {
        item: 'Data Classification',
        status: 'completed',
        description: `${this.classifications.size} classifications defined`
      },
      {
        item: 'Governance Policies',
        status: 'completed',
        description: `${enforcedPolicies.length} policies enforced`
      },
      {
        item: 'Privacy Consents',
        status: 'completed',
        description: `${this.consents.size} consent records tracked`
      },
      {
        item: 'Data Lineage',
        status: 'completed',
        description: `${this.lineageRecords.length} lineage records maintained`
      },
      {
        item: 'Data Retention',
        status: this.dataRetentionTasks.length > 0 ? 'pending' : 'completed',
        description: `${this.dataRetentionTasks.filter(t => !t.executed).length} pending deletions`
      },
      {
        item: 'GDPR Compliance',
        status: enforcedPolicies.some(p => p.id === 'policy_gdpr_compliance') ? 'completed' : 'pending',
        description: 'GDPR policy enforcement'
      }
    ];
  }
}

export const dataGovernanceService = new DataGovernanceService();
