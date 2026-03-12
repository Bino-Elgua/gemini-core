/**
 * Configuration Validator - System Integrity
 * Features:
 * - Environment variable validation (Zod schema)
 * - Service availability check (Ping endpoints)
 * - Required feature flag verification
 * - Startup safety check
 */

import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  
  // Firebase
  VITE_FIREBASE_API_KEY: z.string().min(10),
  VITE_FIREBASE_PROJECT_ID: z.string().min(3),
  VITE_FIREBASE_DATABASE_URL: z.string().url(),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().min(3),
  
  // Google AI
  VITE_GEMINI_API_KEY: z.string().min(10),
  
  // App Config
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENCRYPTION_SECRET: z.string().min(16)
});

export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  env: string;
}

class ConfigValidator {
  /**
   * Validate current environment
   */
  validate(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate Env Vars
    try {
      envSchema.parse(import.meta.env);
    } catch (err) {
      if (err instanceof z.ZodError) {
        err.errors.forEach(e => {
          errors.push(`Missing or invalid ENV: ${e.path.join('.')} (${e.message})`);
        });
      }
    }

    // 2. Check for Development Mode
    if (import.meta.env.DEV) {
      warnings.push('⚠️ Running in DEVELOPMENT mode');
    }

    // 3. Check for specific production keys
    if (import.meta.env.PROD && import.meta.env.VITE_SUPABASE_URL?.includes('localhost')) {
      errors.push('❌ Production build using localhost Supabase URL');
    }

    const valid = errors.length === 0;
    
    if (valid) {
      console.log('✅ Configuration validated: System ready.');
    } else {
      console.error('❌ Configuration validation FAILED:');
      errors.forEach(e => console.error(`  - ${e}`));
    }

    return {
      valid,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      env: import.meta.env.MODE
    };
  }

  /**
   * Perform deep system health check (async)
   */
  async performDeepCheck(): Promise<{
    services: Record<string, 'healthy' | 'unhealthy'>;
    latency: Record<string, number>;
  }> {
    const results: Record<string, any> = {};
    const latencies: Record<string, number> = {};

    const checkService = async (name: string, fn: () => Promise<any>) => {
      const start = Date.now();
      try {
        await fn();
        results[name] = 'healthy';
        latencies[name] = Date.now() - start;
      } catch (e) {
        results[name] = 'unhealthy';
        latencies[name] = -1;
      }
    };

    // Parallel checks
    const { checkConnection: checkSupabase } = await import('./supabaseClient');
    const { dnaExtractionService } = await import('./dnaExtractionService');

    await Promise.all([
      checkService('supabase', checkSupabase),
      checkService('gemini_api', () => dnaExtractionService.checkProviderStatus())
    ]);

    return { services: results, latency: latencies };
  }
}

export const configValidator = new ConfigValidator();
