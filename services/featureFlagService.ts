/**
 * Feature Flag Service
 * 
 * Manages feature toggles stored in Supabase table.
 * Provides caching (5 min TTL) and fallback behavior.
 * 
 * Usage:
 *   const isEnabled = await featureFlagService.isFeatureEnabled('video_generation');
 *   if (isEnabled) { showVideoFeature(); }
 * 
 * Zustand Hook:
 *   const flags = useFeatureFlags();
 *   const hasVideos = flags.videoGeneration;
 */

import { getSupabase, isSupabaseConfigured } from './supabaseClient';

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface FlagsCache {
  flags: Map<string, boolean>;
  timestamp: number;
  ttl: number; // milliseconds
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class FeatureFlagService {
  private cache: FlagsCache = {
    flags: new Map(),
    timestamp: 0,
    ttl: CACHE_TTL,
  };

  private flagDefaults: Map<string, boolean> = new Map([
    ['video_generation', true],
    ['image_generation', true],
    ['competitor_analysis', true],
    ['ai_optimization', true],
    ['advanced_analytics', true],
    ['affiliate_program', true],
    ['webhook_integrations', true],
    ['multi_region_sync', false],
    ['beta_ai_features', false],
    ['performance_mode', false],
  ]);

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    const age = Date.now() - this.cache.timestamp;
    return age < this.cache.ttl;
  }

  /**
   * Get flag value (with cache)
   */
  async isFeatureEnabled(flagName: string): Promise<boolean> {
    // Check cache first
    if (this.isCacheValid() && this.cache.flags.has(flagName)) {
      return this.cache.flags.get(flagName) ?? this.flagDefaults.get(flagName) ?? false;
    }

    // If cache expired, reload from Supabase
    if (!this.isCacheValid()) {
      await this.refreshCache();
    }

    // Return from cache or fallback
    if (this.cache.flags.has(flagName)) {
      return this.cache.flags.get(flagName) ?? false;
    }

    return this.flagDefaults.get(flagName) ?? false;
  }

  /**
   * Get all flags
   */
  async getAllFlags(): Promise<Record<string, boolean>> {
    if (!this.isCacheValid()) {
      await this.refreshCache();
    }

    const result: Record<string, boolean> = {};
    for (const [key, value] of this.cache.flags.entries()) {
      result[key] = value;
    }

    // Fill in defaults for missing flags
    for (const [key, value] of this.flagDefaults.entries()) {
      if (!(key in result)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Refresh cache from Supabase
   */
  private async refreshCache(): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Use defaults if Supabase not available
      this.cache.flags = new Map(this.flagDefaults);
      this.cache.timestamp = Date.now();
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        this.cache.flags = new Map(this.flagDefaults);
        this.cache.timestamp = Date.now();
        return;
      }

      const { data, error } = await supabase
        .from('feature_flags')
        .select('name, enabled')
        .eq('enabled', true); // Only fetch enabled flags for efficiency

      if (error) {
        console.warn('⚠️ Failed to fetch feature flags:', error.message);
        this.cache.flags = new Map(this.flagDefaults);
        this.cache.timestamp = Date.now();
        return;
      }

      // Build new cache from Supabase data
      const newFlags = new Map(this.flagDefaults);
      if (data && Array.isArray(data)) {
        data.forEach((flag) => {
          newFlags.set(flag.name, flag.enabled);
        });
      }

      this.cache.flags = newFlags;
      this.cache.timestamp = Date.now();

      console.log('✅ Feature flags refreshed from Supabase');
    } catch (error) {
      console.error('❌ Feature flag refresh error:', error);
      this.cache.flags = new Map(this.flagDefaults);
      this.cache.timestamp = Date.now();
    }
  }

  /**
   * Force refresh cache immediately
   */
  async refresh(): Promise<void> {
    this.cache.timestamp = 0; // Invalidate cache
    await this.refreshCache();
  }

  /**
   * Update a feature flag (admin only)
   */
  async updateFlag(flagName: string, enabled: boolean): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Cannot update flags without Supabase');
      return false;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('name', flagName);

      if (error) {
        console.error('❌ Failed to update flag:', error.message);
        return false;
      }

      // Invalidate cache
      this.cache.timestamp = 0;
      console.log(`✅ Flag '${flagName}' updated to ${enabled}`);
      return true;
    } catch (error) {
      console.error('❌ Flag update error:', error);
      return false;
    }
  }

  /**
   * Get cache info for debugging
   */
  getCacheInfo() {
    return {
      flags: Array.from(this.cache.flags.entries()),
      timestamp: this.cache.timestamp,
      isValid: this.isCacheValid(),
      ttl: this.cache.ttl,
    };
  }
}

export const featureFlagService = new FeatureFlagService();

/**
 * React Hook for using feature flags
 * 
 * Usage in components:
 *   const flags = useFeatureFlags();
 *   if (flags.videoGeneration) { <VideoComponent /> }
 */
export function useFeatureFlags() {
  // This is a placeholder. Full implementation requires Zustand integration.
  // For now, return a hook that fetches on mount.
  // See: createFeatureFlagsStore() below for Zustand integration.
}

/**
 * Zustand store creator for feature flags
 * 
 * Usage:
 *   const useFeatureFlags = createFeatureFlagsStore();
 *   const { videoGeneration, imageGeneration, refresh } = useFeatureFlags();
 */
export const createFeatureFlagsStore = () => {
  // This is created in store.ts where Zustand is imported
  // Prevents circular dependencies
};

/**
 * Utility: camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Utility: snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Pre-fetch flags on service load for quick initial access
if (isSupabaseConfigured()) {
  featureFlagService.refresh().catch((err) => {
    console.warn('⚠️ Initial feature flag load failed (will use defaults):', err);
  });
}
