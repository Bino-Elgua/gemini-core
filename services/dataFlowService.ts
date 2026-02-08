// Data Flow Service - ETL pipeline management and data transformation
export interface DataFlowStep {
  type: 'extract' | 'transform' | 'load' | 'validate' | 'aggregate';
  config: Record<string, unknown>;
  mapping?: Record<string, string>;
  filters?: Record<string, unknown>;
  validation?: Record<string, unknown>;
}

export interface DataFlow {
  id: string;
  name: string;
  description?: string;
  steps: DataFlowStep[];
  schedule?: string; // cron expression
  onError: 'continue' | 'stop' | 'alert';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataFlowExecution {
  id: string;
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsFailed: number;
  error?: string;
  progress: number;
}

class DataFlowService {
  private flows: Map<string, DataFlow> = new Map();
  private executions: Map<string, DataFlowExecution> = new Map();
  private executionQueue: string[] = [];
  private processing = false;

  async initialize(): Promise<void> {
    this.startExecutionProcessor();
  }

  private startExecutionProcessor(): void {
    setInterval(async () => {
      if (!this.processing && this.executionQueue.length > 0) {
        this.processNextExecution();
      }
    }, 1000);
  }

  private async processNextExecution(): Promise<void> {
    if (this.processing || this.executionQueue.length === 0) return;

    this.processing = true;
    const executionId = this.executionQueue.shift();
    if (executionId) {
      await this.executeDataFlow(executionId);
    }
    this.processing = false;
  }

  async createFlow(name: string, description: string, steps: DataFlowStep[]): Promise<DataFlow> {
    const flow: DataFlow = {
      id: `flow_${Date.now()}`,
      name,
      description,
      steps,
      onError: 'alert',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.flows.set(flow.id, flow);
    return flow;
  }

  async scheduleFlow(flowId: string, schedule: string): Promise<void> {
    const flow = this.flows.get(flowId);
    if (flow) {
      flow.schedule = schedule;
      flow.updatedAt = new Date();
      this.flows.set(flowId, flow);
    }
  }

  async executeFlow(flowId: string): Promise<DataFlowExecution> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const execution: DataFlowExecution = {
      id: `exec_${Date.now()}`,
      flowId,
      status: 'pending',
      recordsProcessed: 0,
      recordsFailed: 0,
      progress: 0
    };

    this.executions.set(execution.id, execution);
    this.executionQueue.push(execution.id);

    return execution;
  }

  private async executeDataFlow(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const flow = this.flows.get(execution.flowId);
    if (!flow) return;

    execution.status = 'running';
    execution.startedAt = new Date();

    try {
      let data: Record<string, unknown>[] = [];

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        execution.progress = (i / flow.steps.length) * 100;

        try {
          data = await this.processStep(step, data);
          execution.recordsProcessed += data.length;
        } catch (error) {
          execution.recordsFailed++;

          if (flow.onError === 'stop') {
            throw error;
          } else if (flow.onError === 'alert') {
            console.warn(`Error in step ${i}: ${error}`);
          }
        }
      }

      execution.status = 'completed';
      execution.progress = 100;
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    execution.completedAt = new Date();
  }

  private async processStep(step: DataFlowStep, data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    switch (step.type) {
      case 'extract':
        return this.extract(step.config);
      case 'transform':
        return this.transform(data, step.mapping, step.config);
      case 'load':
        return this.load(data, step.config);
      case 'validate':
        return this.validate(data, step.validation);
      case 'aggregate':
        return this.aggregate(data, step.config);
    }
    return data;
  }

  private async extract(config: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    // Mock extraction
    const count = (config.count as number) || 100;
    const data: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      data.push({
        id: i,
        value: Math.random() * 1000,
        timestamp: new Date(),
        source: config.source
      });
    }

    return data;
  }

  private async transform(
    data: Record<string, unknown>[],
    mapping?: Record<string, string>,
    config?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    // Apply field mapping
    if (mapping) {
      return data.map(record => {
        const transformed: Record<string, unknown> = {};
        for (const [oldKey, newKey] of Object.entries(mapping)) {
          if (oldKey in record) {
            transformed[newKey] = record[oldKey];
          }
        }
        return transformed;
      });
    }

    return data;
  }

  private async load(data: Record<string, unknown>[], config: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    // Mock loading to database/storage
    console.log(`Loading ${data.length} records to ${config.destination}`);
    return data;
  }

  private async validate(
    data: Record<string, unknown>[],
    validation?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    // Filter valid records
    return data.filter(record => {
      // Mock validation logic
      return record.value !== undefined && record.id !== undefined;
    });
  }

  private async aggregate(
    data: Record<string, unknown>[],
    config: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    // Group and aggregate data
    const groupBy = config.groupBy as string || 'id';
    const aggregates: Record<string, Record<string, unknown>> = {};

    for (const record of data) {
      const key = String(record[groupBy]);
      if (!aggregates[key]) {
        aggregates[key] = { ...record, count: 1, sum: 0 };
      } else {
        aggregates[key].count = ((aggregates[key].count as number) || 0) + 1;
        if (typeof record.value === 'number') {
          aggregates[key].sum = ((aggregates[key].sum as number) || 0) + record.value;
        }
      }
    }

    return Object.values(aggregates);
  }

  async getFlow(flowId: string): Promise<DataFlow | null> {
    return this.flows.get(flowId) || null;
  }

  async listFlows(enabled?: boolean, limit: number = 100): Promise<DataFlow[]> {
    let flows = Array.from(this.flows.values());

    if (enabled !== undefined) {
      flows = flows.filter(f => f.enabled === enabled);
    }

    return flows.slice(-limit);
  }

  async updateFlow(flowId: string, updates: Partial<DataFlow>): Promise<DataFlow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const updated = { ...flow, ...updates, updatedAt: new Date() };
    this.flows.set(flowId, updated);
    return updated;
  }

  async deleteFlow(flowId: string): Promise<void> {
    this.flows.delete(flowId);
  }

  async getExecution(executionId: string): Promise<DataFlowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async listExecutions(flowId?: string, status?: string, limit: number = 100): Promise<DataFlowExecution[]> {
    let executions = Array.from(this.executions.values());

    if (flowId) {
      executions = executions.filter(e => e.flowId === flowId);
    }

    if (status) {
      executions = executions.filter(e => e.status === status);
    }

    return executions.slice(-limit);
  }

  async getFlowStats(): Promise<{
    totalFlows: number;
    enabledFlows: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
  }> {
    const flows = Array.from(this.flows.values());
    const executions = Array.from(this.executions.values());

    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;

    return {
      totalFlows: flows.length,
      enabledFlows: flows.filter(f => f.enabled).length,
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      successRate: executions.length > 0 ? (successful / executions.length) * 100 : 0
    };
  }

  async validateFlow(flowId: string): Promise<{ valid: boolean; errors: string[] }> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      return { valid: false, errors: [`Flow ${flowId} not found`] };
    }

    const errors: string[] = [];

    if (!flow.name) {
      errors.push('Flow name is required');
    }

    if (flow.steps.length === 0) {
      errors.push('Flow must have at least one step');
    }

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      if (!step.type) {
        errors.push(`Step ${i} missing type`);
      }
      if (!step.config) {
        errors.push(`Step ${i} missing config`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const dataFlowService = new DataFlowService();
