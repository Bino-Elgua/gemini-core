/**
 * Sentry Integration Service
 * 
 * Initializes Sentry for error tracking and performance monitoring.
 * Captures unhandled exceptions, promise rejections, and performance metrics.
 * 
 * Configuration:
 * - VITE_SENTRY_DSN: Sentry project DSN (optional)
 * - VITE_SENTRY_ENABLED: Enable/disable Sentry (default: true if DSN present)
 * - VITE_SENTRY_ENVIRONMENT: Environment (development/staging/production)
 * - VITE_SENTRY_TRACE_SAMPLE_RATE: Performance tracing rate (0.0-1.0, default: 0.1)
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
// Note: Some advanced features (Replay, startTransaction, ErrorMessage) 
// may not be available in all Sentry versions. We provide them conditionally.

export interface SentryConfig {
  dsn?: string;
  enabled: boolean;
  environment: string;
  traceSampleRate: number;
  debug: boolean;
}

class SentryService {
  private initialized = false;

  /**
   * Initialize Sentry with config from environment
   */
  initialize(): void {
    if (this.initialized) {
      console.log('ℹ️ Sentry already initialized');
      return;
    }

    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    const enabled = import.meta.env.VITE_SENTRY_ENABLED !== 'false';
    const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
    const traceSampleRate = parseFloat(import.meta.env.VITE_SENTRY_TRACE_SAMPLE_RATE || '0.1');
    const debug = import.meta.env.MODE === 'development';

    if (!dsn || !enabled) {
      console.log('ℹ️ Sentry disabled (no DSN provided)');
      return;
    }

    try {
      const integrations: Sentry.Integration[] = [
        new BrowserTracing({
          tracePropagationTargets: ['localhost', /^\//],
          shouldCreateSpanForRequest: (url) => {
            return !url.includes('/health') && !url.includes('/metrics');
          },
        }),
      ];

      // Add Replay integration if available
      if ((Sentry as any).Replay) {
        integrations.push(
          new (Sentry as any).Replay({
            maskAllText: true,
            blockAllMedia: true,
          })
        );
      }

      Sentry.init({
        dsn,
        environment,
        integrations,
        tracesSampleRate: traceSampleRate,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        debug,
        beforeSend(event, hint) {
          // Suppress certain errors
          if (
            hint.originalException &&
            typeof hint.originalException === 'string' &&
            hint.originalException.includes('ResizeObserver loop limit exceeded')
          ) {
            return null; // Ignore ResizeObserver errors
          }
          return event;
        },
      });

      this.initialized = true;
      console.log(`✅ Sentry initialized (env: ${environment})`);
    } catch (error) {
      console.error('❌ Sentry initialization failed:', error);
    }
  }

  /**
   * Capture custom message
   */
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
    context?: Record<string, any>
  ): void {
    if (!this.initialized) return;

    Sentry.captureMessage(message, level);
    if (context) {
      Sentry.setContext('custom', context);
    }
  }

  /**
   * Capture custom exception
   */
  captureException(
    error: Error | unknown,
    context?: Record<string, any>
  ): void {
    if (!this.initialized) return;

    if (context) {
      Sentry.setContext('error_context', context);
    }
    Sentry.captureException(error);
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, email?: string, name?: string): void {
    if (!this.initialized) return;

    Sentry.setUser({
      id: userId,
      email,
      username: name,
    });
  }

  /**
   * Clear user context (on logout)
   */
  clearUser(): void {
    if (!this.initialized) return;

    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
    data?: Record<string, any>
  ): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Start a performance transaction
   */
  startTransaction(
    name: string,
    op: string = 'http.request'
  ): any {
    if (!this.initialized) return null;

    // startTransaction available in Sentry >= 6.0
    if ((Sentry as any).startTransaction) {
      return (Sentry as any).startTransaction({
        name,
        op,
      });
    }

    return null;
  }

  /**
   * Check if Sentry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get config summary
   */
  getConfig(): SentryConfig {
    return {
      dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
      enabled: this.initialized,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
      traceSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACE_SAMPLE_RATE || '0.1'),
      debug: import.meta.env.MODE === 'development',
    };
  }
}

export const sentryService = new SentryService();

/**
 * Export Sentry's utility functions for use in components
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const SentryErrorMessage = (Sentry as any).ErrorMessage || null;
