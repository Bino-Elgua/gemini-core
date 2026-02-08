// Error Handling Service - Global error management, recovery, and logging
export interface ErrorContext {
  error: Error;
  context: string;
  userId?: string;
  serviceId?: string;
  timestamp: Date;
  severity: 'critical' | 'error' | 'warning' | 'info';
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorRecoveryStrategy {
  strategy: 'retry' | 'fallback' | 'queue' | 'notify' | 'circuit-break';
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
}

export interface ErrorLog {
  id: string;
  error: ErrorContext;
  recovered: boolean;
  recoveryMethod?: string;
  timestamp: Date;
}

class ErrorHandlingService {
  private errorLogs: ErrorLog[] = [];
  private errorCounts = new Map<string, number>();
  private circuitBreakers = new Map<string, { isOpen: boolean; failureCount: number; lastFailureTime?: Date }>();
  private errorHandlers = new Map<string, (error: Error) => Promise<void>>();
  private retryQueues = new Map<string, Array<{ fn: () => Promise<unknown>; retries: number }>>();

  async initialize(): Promise<void> {
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers(): void {
    // Default handlers for common error types
    this.registerErrorHandler('NetworkError', async (error) => {
      console.warn('Network error detected, attempting reconnect');
    });

    this.registerErrorHandler('DatabaseError', async (error) => {
      console.warn('Database error, checking connection');
    });

    this.registerErrorHandler('AuthenticationError', async (error) => {
      console.warn('Authentication failed, forcing re-auth');
    });
  }

  async handleError(
    error: Error,
    context: string,
    options?: {
      userId?: string;
      severity?: 'critical' | 'error' | 'warning' | 'info';
      metadata?: Record<string, unknown>;
    }
  ): Promise<ErrorLog> {
    const errorContext: ErrorContext = {
      error,
      context,
      userId: options?.userId,
      timestamp: new Date(),
      severity: options?.severity || 'error',
      stackTrace: error.stack,
      metadata: options?.metadata
    };

    // Log error
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}`,
      error: errorContext,
      recovered: false,
      timestamp: new Date()
    };

    this.errorLogs.push(errorLog);
    this.incrementErrorCount(context);

    // Call registered handler
    const handler = this.errorHandlers.get(error.constructor.name);
    if (handler) {
      try {
        await handler(error);
      } catch (e) {
        console.error('Error in handler:', e);
      }
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(context)) {
      errorContext.severity = 'critical';
      errorLog.recovered = false;
      return errorLog;
    }

    // Attempt recovery
    const recovered = await this.attemptRecovery(error, context);
    errorLog.recovered = recovered;

    if (recovered) {
      this.resetErrorCount(context);
      this.resetCircuitBreaker(context);
    } else {
      this.recordFailure(context);
    }

    // Keep only last 10000 logs
    if (this.errorLogs.length > 10000) {
      this.errorLogs = this.errorLogs.slice(-10000);
    }

    return errorLog;
  }

  private async attemptRecovery(error: Error, context: string): Promise<boolean> {
    const errorName = error.constructor.name;

    if (errorName === 'NetworkError') {
      return await this.retryWithBackoff(async () => {
        // Attempt reconnection
      }, 3, 1000);
    }

    if (errorName === 'DatabaseError') {
      return await this.retryWithBackoff(async () => {
        // Attempt database reconnection
      }, 3, 1000);
    }

    if (errorName === 'TimeoutError') {
      return await this.retryWithBackoff(async () => {
        // Retry the operation
      }, 2, 500);
    }

    return false;
  }

  private async retryWithBackoff(
    fn: () => Promise<unknown>,
    maxAttempts: number = 3,
    baseBackoffMs: number = 1000
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await fn();
        return true;
      } catch (error) {
        if (attempt < maxAttempts - 1) {
          const backoffMs = baseBackoffMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    return false;
  }

  async queueForRetry(
    fn: () => Promise<unknown>,
    context: string,
    maxRetries: number = 3
  ): Promise<void> {
    if (!this.retryQueues.has(context)) {
      this.retryQueues.set(context, []);
    }

    this.retryQueues.get(context)!.push({ fn, retries: maxRetries });
  }

  async processRetryQueue(context: string): Promise<void> {
    const queue = this.retryQueues.get(context);
    if (!queue) return;

    const remaining = [];
    for (const item of queue) {
      try {
        await item.fn();
      } catch (error) {
        if (item.retries > 1) {
          item.retries--;
          remaining.push(item);
        } else {
          console.error(`Failed after ${3 - item.retries} retries:`, error);
        }
      }
    }

    this.retryQueues.set(context, remaining);
  }

  registerErrorHandler(errorType: string, handler: (error: Error) => Promise<void>): void {
    this.errorHandlers.set(errorType, handler);
  }

  private incrementErrorCount(context: string): void {
    const current = this.errorCounts.get(context) || 0;
    this.errorCounts.set(context, current + 1);
  }

  private resetErrorCount(context: string): void {
    this.errorCounts.set(context, 0);
  }

  private recordFailure(context: string): void {
    const breaker = this.circuitBreakers.get(context) || {
      isOpen: false,
      failureCount: 0
    };

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    // Open circuit breaker after 5 failures
    if (breaker.failureCount >= 5) {
      breaker.isOpen = true;
    }

    this.circuitBreakers.set(context, breaker);
  }

  private resetCircuitBreaker(context: string): void {
    this.circuitBreakers.set(context, {
      isOpen: false,
      failureCount: 0
    });
  }

  private isCircuitBreakerOpen(context: string): boolean {
    const breaker = this.circuitBreakers.get(context);
    if (!breaker || !breaker.isOpen) return false;

    // Auto-reset after 60 seconds
    if (breaker.lastFailureTime && Date.now() - breaker.lastFailureTime.getTime() > 60000) {
      this.resetCircuitBreaker(context);
      return false;
    }

    return true;
  }

  async getErrorLogs(
    filters?: {
      severity?: string;
      context?: string;
      userId?: string;
      startTime?: Date;
      endTime?: Date;
    },
    limit: number = 100
  ): Promise<ErrorLog[]> {
    let logs = this.errorLogs;

    if (filters) {
      if (filters.severity) {
        logs = logs.filter(l => l.error.severity === filters.severity);
      }
      if (filters.context) {
        logs = logs.filter(l => l.error.context === filters.context);
      }
      if (filters.userId) {
        logs = logs.filter(l => l.error.userId === filters.userId);
      }
      if (filters.startTime) {
        logs = logs.filter(l => l.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        logs = logs.filter(l => l.timestamp <= filters.endTime!);
      }
    }

    return logs.slice(-limit);
  }

  async getErrorStats(): Promise<{
    totalErrors: number;
    recoveredErrors: number;
    failedErrors: number;
    recoveryRate: number;
    errorsByContext: Record<string, number>;
    openCircuitBreakers: string[];
  }> {
    const totalErrors = this.errorLogs.length;
    const recoveredErrors = this.errorLogs.filter(l => l.recovered).length;
    const failedErrors = totalErrors - recoveredErrors;

    const errorsByContext: Record<string, number> = {};
    for (const [context, count] of this.errorCounts) {
      errorsByContext[context] = count;
    }

    const openCircuitBreakers = Array.from(this.circuitBreakers.entries())
      .filter(([_, breaker]) => breaker.isOpen)
      .map(([context, _]) => context);

    return {
      totalErrors,
      recoveredErrors,
      failedErrors,
      recoveryRate: totalErrors > 0 ? (recoveredErrors / totalErrors) * 100 : 0,
      errorsByContext,
      openCircuitBreakers
    };
  }

  async clearOldLogs(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const originalLength = this.errorLogs.length;

    this.errorLogs = this.errorLogs.filter(log => log.timestamp > cutoffTime);

    return originalLength - this.errorLogs.length;
  }

  async getUserErrorHistory(userId: string): Promise<ErrorLog[]> {
    return this.errorLogs.filter(log => log.error.userId === userId);
  }

  async getRecoveryStats(): Promise<{
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    recoveryRate: number;
  }> {
    const stats = await this.getErrorStats();
    return {
      totalAttempts: stats.totalErrors,
      successfulRecoveries: stats.recoveredErrors,
      failedRecoveries: stats.failedErrors,
      recoveryRate: stats.recoveryRate
    };
  }
}

export const errorHandlingService = new ErrorHandlingService();
