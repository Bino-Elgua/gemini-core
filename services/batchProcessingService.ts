// Batch Processing Service - Large-scale data operations, queuing, processing
export interface BatchJob {
  id: string;
  type: 'import' | 'export' | 'processing' | 'analysis';
  portfolioId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: Record<string, unknown>;
  error?: string;
}

export interface BatchJobConfig {
  batchSize: number;
  timeout: number;
  retryAttempts: number;
  parallelization: number;
}

class BatchProcessingService {
  private jobs: Map<string, BatchJob> = new Map();
  private queue: string[] = [];
  private config: BatchJobConfig = {
    batchSize: 1000,
    timeout: 300000, // 5 minutes
    retryAttempts: 3,
    parallelization: 4
  };
  private processing = false;

  async initialize(): Promise<void> {
    this.startQueueProcessor();
  }

  async createBatchJob(
    type: 'import' | 'export' | 'processing' | 'analysis',
    portfolioId: string,
    totalRecords: number
  ): Promise<BatchJob> {
    const job: BatchJob = {
      id: `batch_${Date.now()}`,
      type,
      portfolioId,
      status: 'queued',
      progress: 0,
      totalRecords,
      processedRecords: 0,
      failedRecords: 0,
      createdAt: new Date()
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);

    return job;
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.queue.length > 0) {
        this.processNextBatch();
      }
    }, 1000);
  }

  private async processNextBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const jobId = this.queue.shift();
      if (!jobId) return;

      const job = this.jobs.get(jobId);
      if (!job) return;

      job.status = 'processing';
      job.startedAt = new Date();
      this.jobs.set(jobId, job);

      await this.processBatchJob(jobId);
    } finally {
      this.processing = false;
    }
  }

  private async processBatchJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      const batches = Math.ceil(job.totalRecords / this.config.batchSize);

      for (let i = 0; i < batches; i++) {
        const batchStart = i * this.config.batchSize;
        const batchEnd = Math.min(batchStart + this.config.batchSize, job.totalRecords);
        const batchSize = batchEnd - batchStart;

        // Process batch
        const result = await this.processBatch(job.type, batchStart, batchSize);

        job.processedRecords += result.processed;
        job.failedRecords += result.failed;
        job.progress = (job.processedRecords / job.totalRecords) * 100;

        this.jobs.set(jobId, job);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        processedRecords: job.processedRecords,
        failedRecords: job.failedRecords,
        successRate: (job.processedRecords / job.totalRecords) * 100
      };

      this.jobs.set(jobId, job);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.jobs.set(jobId, job);
    }
  }

  private async processBatch(
    type: string,
    start: number,
    size: number
  ): Promise<{ processed: number; failed: number }> {
    // Mock batch processing
    const failureRate = Math.random() * 0.1; // 0-10% failure rate
    const failed = Math.floor(size * failureRate);
    const processed = size - failed;

    return { processed, failed };
  }

  async getJob(jobId: string): Promise<BatchJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async listJobs(
    portfolioId: string,
    status?: string
  ): Promise<BatchJob[]> {
    let jobs = Array.from(this.jobs.values()).filter(j => j.portfolioId === portfolioId);

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    return jobs;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job && (job.status === 'queued' || job.status === 'processing')) {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      this.jobs.set(jobId, job);
    }

    // Remove from queue if still there
    const queueIndex = this.queue.indexOf(jobId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }
  }

  async getQueueStatus(): Promise<{
    queueLength: number;
    processing: boolean;
    config: BatchJobConfig;
  }> {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      config: this.config
    };
  }

  async updateConfig(updates: Partial<BatchJobConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
  }

  async getJobProgress(jobId: string): Promise<{
    progress: number;
    processedRecords: number;
    failedRecords: number;
    totalRecords: number;
    status: string;
    estimatedTimeRemaining: number;
  }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    let estimatedTimeRemaining = 0;
    if (job.status === 'processing' && job.startedAt) {
      const elapsed = Date.now() - job.startedAt.getTime();
      const rate = job.processedRecords / (elapsed / 1000); // records per second
      estimatedTimeRemaining = (job.totalRecords - job.processedRecords) / rate;
    }

    return {
      progress: job.progress,
      processedRecords: job.processedRecords,
      failedRecords: job.failedRecords,
      totalRecords: job.totalRecords,
      status: job.status,
      estimatedTimeRemaining
    };
  }

  async retryFailedRecords(jobId: string): Promise<BatchJob> {
    const job = this.jobs.get(jobId);
    if (!job || job.failedRecords === 0) {
      throw new Error('No failed records to retry');
    }

    // Create new batch job for failed records
    const retryJob = await this.createBatchJob(
      job.type,
      job.portfolioId,
      job.failedRecords
    );

    return retryJob;
  }

  async deleteBatchJob(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async getBatchStatistics(): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalProcessed: number;
    totalFailed: number;
    averageSuccessRate: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const failedJobs = jobs.filter(j => j.status === 'failed');

    const totalProcessed = completedJobs.reduce((sum, j) => sum + j.processedRecords, 0);
    const totalFailed = jobs.reduce((sum, j) => sum + j.failedRecords, 0);
    const totalRecords = jobs.reduce((sum, j) => sum + j.totalRecords, 0);

    return {
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      totalProcessed,
      totalFailed,
      averageSuccessRate: totalRecords > 0 ? (totalProcessed / totalRecords) * 100 : 0
    };
  }
}

export const batchProcessingService = new BatchProcessingService();
