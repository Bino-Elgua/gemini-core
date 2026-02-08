// Config Validator - Configuration validation and schema management
export interface ConfigSchema {
  id: string;
  name: string;
  fields: ConfigField[];
  required: string[];
  createdAt: Date;
}

export interface ConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: unknown;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
    custom?: (value: unknown) => boolean;
  };
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value: unknown;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface ConfigSnapshot {
  id: string;
  schemaId: string;
  data: Record<string, unknown>;
  validated: boolean;
  timestamp: Date;
  hash: string;
}

class ConfigValidator {
  private schemas: Map<string, ConfigSchema> = new Map();
  private snapshots: Map<string, ConfigSnapshot> = new Map();
  private currentConfig: Record<string, unknown> = {};
  private configHistory: Array<{ config: Record<string, unknown>; timestamp: Date }> = [];

  async initialize(): Promise<void> {
    this.setupDefaultSchemas();
  }

  private setupDefaultSchemas(): void {
    // Core application schema
    this.registerSchema({
      id: 'core-config',
      name: 'Core Configuration',
      fields: [
        {
          name: 'nodeEnv',
          type: 'string',
          required: true,
          validation: { enum: ['development', 'production', 'test'] },
          description: 'Node environment'
        },
        {
          name: 'port',
          type: 'number',
          required: true,
          validation: { min: 1, max: 65535 },
          description: 'Server port'
        },
        {
          name: 'apiUrl',
          type: 'string',
          required: true,
          validation: { pattern: '^https?://' },
          description: 'API base URL'
        },
        {
          name: 'databaseUrl',
          type: 'string',
          required: true,
          description: 'Database connection URL'
        },
        {
          name: 'secretKey',
          type: 'string',
          required: true,
          validation: { minLength: 32 },
          description: 'Secret key for encryption'
        },
        {
          name: 'debug',
          type: 'boolean',
          default: false,
          description: 'Enable debug mode'
        }
      ],
      required: ['nodeEnv', 'port', 'apiUrl', 'databaseUrl', 'secretKey']
    });

    // Supabase schema
    this.registerSchema({
      id: 'supabase-config',
      name: 'Supabase Configuration',
      fields: [
        {
          name: 'url',
          type: 'string',
          required: true,
          validation: { pattern: '^https://' },
          description: 'Supabase project URL'
        },
        {
          name: 'anonKey',
          type: 'string',
          required: true,
          description: 'Supabase anon key'
        },
        {
          name: 'serviceRoleKey',
          type: 'string',
          required: true,
          description: 'Supabase service role key'
        }
      ],
      required: ['url', 'anonKey', 'serviceRoleKey']
    });

    // Feature flags schema
    this.registerSchema({
      id: 'feature-flags',
      name: 'Feature Flags',
      fields: [
        {
          name: 'enableBeta',
          type: 'boolean',
          default: false,
          description: 'Enable beta features'
        },
        {
          name: 'enableAnalytics',
          type: 'boolean',
          default: true,
          description: 'Enable analytics'
        },
        {
          name: 'enableAI',
          type: 'boolean',
          default: true,
          description: 'Enable AI features'
        }
      ],
      required: []
    });
  }

  registerSchema(schema: ConfigSchema): void {
    schema.createdAt = new Date();
    this.schemas.set(schema.id, schema);
  }

  async validateConfig(schemaId: string, config: Record<string, unknown>): Promise<ValidationResult> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [{ field: 'schema', message: `Schema ${schemaId} not found`, value: null }],
        warnings: []
      };
    }

    const errors: Array<{ field: string; message: string; value: unknown }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Check required fields
    for (const requiredField of schema.required) {
      if (!(requiredField in config) || config[requiredField] === undefined || config[requiredField] === null) {
        errors.push({
          field: requiredField,
          message: `Required field "${requiredField}" is missing`,
          value: config[requiredField]
        });
      }
    }

    // Validate fields
    for (const field of schema.fields) {
      if (!(field.name in config) && !field.required) {
        continue;
      }

      const value = config[field.name];

      // Type validation
      if (value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== field.type) {
          errors.push({
            field: field.name,
            message: `Field "${field.name}" must be of type ${field.type}, got ${actualType}`,
            value
          });
          continue;
        }

        // Validation
        if (field.validation) {
          const validationError = this.validateField(field, value);
          if (validationError) {
            errors.push({
              field: field.name,
              message: validationError,
              value
            });
          }
        }
      } else if (field.required) {
        errors.push({
          field: field.name,
          message: `Required field "${field.name}" is missing`,
          value
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateField(field: ConfigField, value: unknown): string | null {
    if (!field.validation) return null;

    const v = field.validation;

    if (typeof value === 'string') {
      if (v.minLength !== undefined && value.length < v.minLength) {
        return `Field "${field.name}" must have at least ${v.minLength} characters`;
      }
      if (v.maxLength !== undefined && value.length > v.maxLength) {
        return `Field "${field.name}" must have at most ${v.maxLength} characters`;
      }
      if (v.pattern && !new RegExp(v.pattern).test(value)) {
        return `Field "${field.name}" does not match pattern ${v.pattern}`;
      }
    }

    if (typeof value === 'number') {
      if (v.min !== undefined && value < v.min) {
        return `Field "${field.name}" must be at least ${v.min}`;
      }
      if (v.max !== undefined && value > v.max) {
        return `Field "${field.name}" must be at most ${v.max}`;
      }
    }

    if (v.enum && !v.enum.includes(value)) {
      return `Field "${field.name}" must be one of: ${v.enum.join(', ')}`;
    }

    if (v.custom && !v.custom(value)) {
      return `Field "${field.name}" failed custom validation`;
    }

    return null;
  }

  async applyConfig(config: Record<string, unknown>): Promise<void> {
    this.currentConfig = config;
    this.configHistory.push({
      config: { ...config },
      timestamp: new Date()
    });

    // Keep only last 100 snapshots
    if (this.configHistory.length > 100) {
      this.configHistory = this.configHistory.slice(-100);
    }
  }

  async getConfig(): Promise<Record<string, unknown>> {
    return this.currentConfig;
  }

  async setConfigValue(key: string, value: unknown): Promise<void> {
    this.currentConfig[key] = value;
    this.configHistory.push({
      config: { ...this.currentConfig },
      timestamp: new Date()
    });
  }

  async getConfigValue(key: string): Promise<unknown> {
    return this.currentConfig[key];
  }

  async createSnapshot(schemaId: string): Promise<ConfigSnapshot> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      throw new Error(`Schema ${schemaId} not found`);
    }

    const snapshot: ConfigSnapshot = {
      id: `snapshot_${Date.now()}`,
      schemaId,
      data: { ...this.currentConfig },
      validated: true,
      timestamp: new Date(),
      hash: this.hashConfig(this.currentConfig)
    };

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    this.currentConfig = { ...snapshot.data };
  }

  async getSnapshots(schemaId: string, limit: number = 50): Promise<ConfigSnapshot[]> {
    return Array.from(this.snapshots.values())
      .filter(s => s.schemaId === schemaId)
      .slice(-limit);
  }

  async getConfigHistory(limit: number = 50): Promise<Array<{ config: Record<string, unknown>; timestamp: Date }>> {
    return this.configHistory.slice(-limit);
  }

  async compareConfigs(
    snapshotId1: string,
    snapshotId2: string
  ): Promise<Array<{ field: string; before: unknown; after: unknown }>> {
    const snap1 = this.snapshots.get(snapshotId1);
    const snap2 = this.snapshots.get(snapshotId2);

    if (!snap1 || !snap2) {
      throw new Error('Snapshot not found');
    }

    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];

    const allKeys = new Set([...Object.keys(snap1.data), ...Object.keys(snap2.data)]);

    for (const key of allKeys) {
      if (snap1.data[key] !== snap2.data[key]) {
        changes.push({
          field: key,
          before: snap1.data[key],
          after: snap2.data[key]
        });
      }
    }

    return changes;
  }

  private hashConfig(config: Record<string, unknown>): string {
    return JSON.stringify(config)
      .split('')
      .reduce((hash, char) => {
        return ((hash << 5) - hash) + char.charCodeAt(0);
      }, 0)
      .toString(16);
  }

  async getSchema(schemaId: string): Promise<ConfigSchema | null> {
    return this.schemas.get(schemaId) || null;
  }

  async listSchemas(): Promise<ConfigSchema[]> {
    return Array.from(this.schemas.values());
  }

  async validateAllSchemas(): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};

    for (const [schemaId] of this.schemas) {
      results[schemaId] = await this.validateConfig(schemaId, this.currentConfig);
    }

    return results;
  }

  async exportConfig(format: 'json' | 'yaml' | 'env'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.currentConfig, null, 2);
    }

    if (format === 'yaml') {
      // Simple YAML generation
      let yaml = '';
      for (const [key, value] of Object.entries(this.currentConfig)) {
        yaml += `${key}: ${JSON.stringify(value)}\n`;
      }
      return yaml;
    }

    if (format === 'env') {
      // .env format
      let env = '';
      for (const [key, value] of Object.entries(this.currentConfig)) {
        env += `${key.toUpperCase()}=${JSON.stringify(value)}\n`;
      }
      return env;
    }

    return '';
  }
}

export const configValidator = new ConfigValidator();
