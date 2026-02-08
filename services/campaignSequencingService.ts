import { Workflow, WorkflowAction } from '../types-extended';
import { hybridStorage } from './hybridStorageService';

interface CampaignSequence {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  steps: SequenceStep[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  metrics: SequenceMetrics;
  createdAt: Date;
  updatedAt: Date;
}

interface SequenceStep {
  id: string;
  order: number;
  type: 'email' | 'social' | 'sms' | 'delay' | 'conditional';
  content: string;
  delay?: number; // minutes
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string;
  };
  trigger?: {
    event: string;
    waitForResponse: boolean;
  };
  executedAt?: Date;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
}

interface SequenceMetrics {
  totalExecuted: number;
  successCount: number;
  failureCount: number;
  conversionCount: number;
  conversionRate: number;
  averageEngagementTime: number;
}

class CampaignSequencingService {
  async createSequence(sequence: Omit<CampaignSequence, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>): Promise<CampaignSequence> {
    const newSequence: CampaignSequence = {
      ...sequence,
      id: `seq-${Date.now()}`,
      metrics: {
        totalExecuted: 0,
        successCount: 0,
        failureCount: 0,
        conversionCount: 0,
        conversionRate: 0,
        averageEngagementTime: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store locally
    await hybridStorage.set(`campaign-sequence-${newSequence.id}`, newSequence);
    console.log(`✅ Campaign sequence created: ${newSequence.name}`);

    return newSequence;
  }

  async getSequence(id: string): Promise<CampaignSequence | null> {
    return await hybridStorage.get(`campaign-sequence-${id}`);
  }

  async listSequencesByCampaign(campaignId: string): Promise<CampaignSequence[]> {
    const allData = await hybridStorage.getAll();
    const sequences: CampaignSequence[] = [];

    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('campaign-sequence-') && value && value.campaignId === campaignId) {
        sequences.push(value);
      }
    }

    return sequences;
  }

  async updateSequence(id: string, updates: Partial<CampaignSequence>): Promise<CampaignSequence> {
    const current = await this.getSequence(id);
    if (!current) throw new Error('Sequence not found');

    const updated = {
      ...current,
      ...updates,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date()
    };

    await hybridStorage.set(`campaign-sequence-${id}`, updated);
    console.log(`✅ Sequence updated: ${updated.name}`);

    return updated;
  }

  async executeStep(sequenceId: string, stepId: string): Promise<boolean> {
    const sequence = await this.getSequence(sequenceId);
    if (!sequence) throw new Error('Sequence not found');

    const step = sequence.steps.find(s => s.id === stepId);
    if (!step) throw new Error('Step not found');

    try {
      // Execute step based on type
      switch (step.type) {
        case 'email':
          await this.executeEmailStep(step);
          break;
        case 'social':
          await this.executeSocialStep(step);
          break;
        case 'sms':
          await this.executeSMSStep(step);
          break;
        case 'delay':
          await this.executeDelayStep(step);
          break;
        case 'conditional':
          await this.executeConditionalStep(step);
          break;
      }

      step.executedAt = new Date();
      step.status = 'completed';
      sequence.metrics.totalExecuted++;
      sequence.metrics.successCount++;

      await this.updateSequence(sequenceId, sequence);
      console.log(`✅ Step executed: ${step.id}`);

      return true;
    } catch (error) {
      step.status = 'failed';
      sequence.metrics.failureCount++;
      await this.updateSequence(sequenceId, sequence);
      console.error(`❌ Step failed: ${step.id}`, error);

      return false;
    }
  }

  private async executeEmailStep(step: SequenceStep): Promise<void> {
    console.log(`📧 Sending email: ${step.content.substring(0, 50)}...`);
    // Would integrate with emailService
  }

  private async executeSocialStep(step: SequenceStep): Promise<void> {
    console.log(`📱 Posting to social: ${step.content.substring(0, 50)}...`);
    // Would integrate with socialPostingService
  }

  private async executeSMSStep(step: SequenceStep): Promise<void> {
    console.log(`💬 Sending SMS: ${step.content.substring(0, 50)}...`);
    // Would integrate with SMS provider
  }

  private async executeDelayStep(step: SequenceStep): Promise<void> {
    if (step.delay) {
      console.log(`⏳ Delaying for ${step.delay} minutes...`);
      await new Promise(resolve => setTimeout(resolve, step.delay! * 60 * 1000));
    }
  }

  private async executeConditionalStep(step: SequenceStep): Promise<void> {
    console.log(`🔀 Evaluating condition...`);
    // Would evaluate condition and branch logic
  }

  async startSequence(id: string): Promise<void> {
    const sequence = await this.getSequence(id);
    if (!sequence) throw new Error('Sequence not found');

    sequence.status = 'active';
    sequence.startDate = new Date();

    await this.updateSequence(id, sequence);
    console.log(`✅ Sequence started: ${sequence.name}`);

    // Schedule execution of steps
    await this.scheduleSteps(sequence);
  }

  private async scheduleSteps(sequence: CampaignSequence): Promise<void> {
    for (const step of sequence.steps) {
      if (step.type === 'delay') {
        await this.executeStep(sequence.id, step.id);
      } else {
        // Schedule based on delays
        const delayMs = (step.delay || 0) * 60 * 1000;
        setTimeout(() => this.executeStep(sequence.id, step.id), delayMs);
      }
    }
  }

  async pauseSequence(id: string): Promise<void> {
    const sequence = await this.getSequence(id);
    if (!sequence) throw new Error('Sequence not found');

    sequence.status = 'paused';
    await this.updateSequence(id, sequence);
    console.log(`⏸️ Sequence paused: ${sequence.name}`);
  }

  async completeSequence(id: string): Promise<void> {
    const sequence = await this.getSequence(id);
    if (!sequence) throw new Error('Sequence not found');

    sequence.status = 'completed';
    sequence.endDate = new Date();
    await this.updateSequence(id, sequence);
    console.log(`✅ Sequence completed: ${sequence.name}`);
  }

  async getSequenceMetrics(id: string): Promise<SequenceMetrics | null> {
    const sequence = await this.getSequence(id);
    return sequence?.metrics || null;
  }
}

export const campaignSequencingService = new CampaignSequencingService();
