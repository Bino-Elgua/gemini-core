/**
 * Error Handling Service - Enterprise Reliability
 * Features:
 * - Centralized error classification
 * - Automatic retry logic with exponential backoff
 * - User-friendly error mapping
 * - Sentry/Log persistence
 * - Critical failure circuit breaking
 */

import { sentryService } from './sentryService';
import { advancedSecurityServiceEnhanced } from './advancedSecurityServiceEnhanced';

export enum ErrorSeverity {
  LOW = 'low',      // Non-blocking (e.g., failed to load user avatar)
  MEDIUM = 'medium', // Partial failure (e.g., single campaign asset failed)
  HIGH = 'high',    // Feature failure (e.g., cannot extract DNA)
  CRITICAL = 'critical' // System failure (e.g., database down)
}

export interface AppError extends Error {
  code: string;
  severity: ErrorSeverity;
  retryable: boolean;
  context?: Record<string, any>;
}

class ErrorHandlingService {
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; open: boolean }>();
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RECOVERY_TIME_MS = 30000; // 30s

  /**
   * Handle application error
   */
  async handleError(error: any, context?: string): Promise<void> {
    const appError = this.classifyError(error);
    
    // 1. Log to Sentry
    sentryService.captureException(error, { 
      level: this.mapSeverityToSentry(appError.severity),
      extra: { context, ...appError.context }
    });

    // 2. Log to Audit (if HIGH or CRITICAL)
    if (appError.severity === ErrorSeverity.HIGH || appError.severity === ErrorSeverity.CRITICAL) {
      await advancedSecurityServiceEnhanced.persistAuditLog(
        appError.context?.userId || 'system',
        'SYSTEM_ERROR',
        context || 'general',
        { message: appError.message, code: appError.code, severity: appError.severity },
        'failure'
      );
    }

    // 3. Update Circuit Breaker
    if (context) this.trackFailure(context);

    console.error(`[ErrorHandlingService] ${appError.code}: ${appError.message} (${appError.severity})`);
  }

  /**
   * Execute function with automatic retry logic
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: { maxRetries?: number; delayMs?: number; context?: string } = {}
  ): Promise<T> {
    const { maxRetries = 3, delayMs = 1000, context } = options;
    
    // Check circuit breaker
    if (context && this.isCircuitOpen(context)) {
      throw new Error(`Circuit breaker is OPEN for ${context}. Please wait.`);
    }

    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const appError = this.classifyError(error);
        
        if (!appError.retryable || attempt === maxRetries) {
          break;
        }

        const backoff = delayMs * Math.pow(2, attempt - 1);
        console.warn(`[Retry] Attempt ${attempt} failed for ${context}. Retrying in ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }

    if (context) this.trackFailure(context);
    throw lastError;
  }

  private classifyError(error: any): AppError {
    if (error.code && error.severity) return error as AppError;

    const message = error.message || String(error);
    let code = 'UNKNOWN_ERROR';
    let severity = ErrorSeverity.MEDIUM;
    let retryable = true;

    if (/quota|limit|429/i.test(message)) {
      code = 'QUOTA_EXCEEDED';
      severity = ErrorSeverity.HIGH;
      retryable = true;
    } else if (/auth|unauthorized|401|403/i.test(message)) {
      code = 'AUTH_FAILURE';
      severity = ErrorSeverity.HIGH;
      retryable = false;
    } else if (/network|fetch|timeout/i.test(message)) {
      code = 'NETWORK_ERROR';
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
    } else if (/database|supabase|firebase/i.test(message)) {
      code = 'DATABASE_ERROR';
      severity = ErrorSeverity.CRITICAL;
      retryable = true;
    }

    const appError = new Error(message) as AppError;
    appError.code = code;
    appError.severity = severity;
    appError.retryable = retryable;
    return appError;
  }

  private mapSeverityToSentry(severity: ErrorSeverity): 'debug' | 'info' | 'warning' | 'error' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.LOW: return 'info';
      case ErrorSeverity.MEDIUM: return 'warning';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'fatal';
      default: return 'error';
    }
  }

  private trackFailure(context: string): void {
    const stats = this.circuitBreakers.get(context) || { failures: 0, lastFailure: 0, open: false };
    stats.failures++;
    stats.lastFailure = Date.now();

    if (stats.failures >= this.FAILURE_THRESHOLD) {
      stats.open = true;
      console.error(`🔴 Circuit Breaker OPEN for: ${context}`);
    }

    this.circuitBreakers.set(context, stats);
  }

  private isCircuitOpen(context: string): boolean {
    const stats = this.circuitBreakers.get(context);
    if (!stats || !stats.open) return false;

    // Check if recovery time has passed
    if (Date.now() - stats.lastFailure > this.RECOVERY_TIME_MS) {
      stats.open = false;
      stats.failures = 0;
      this.circuitBreakers.set(context, stats);
      console.log(`🟢 Circuit Breaker CLOSED for: ${context} (Recovered)`);
      return false;
    }

    return true;
  }
}

export const errorHandlingService = new ErrorHandlingService();
