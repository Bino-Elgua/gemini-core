import { getSupabase, isSupabaseConfigured } from './supabaseClient';

interface StorageItem {
  key: string;
  value: any;
  timestamp: number;
  synced: boolean;
}

class HybridStorageService {
  private cache: Map<string, StorageItem> = new Map();
  private syncQueue: StorageItem[] = [];
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    console.log('🔄 Initializing hybrid storage...');
    
    // Load from localStorage
    this.loadFromLocalStorage();
    console.log(`✅ Loaded ${this.cache.size} items from localStorage`);

    // Try to sync with Supabase if configured
    if (isSupabaseConfigured()) {
      await this.syncFromCloud();
      console.log('✅ Synced with cloud');
      
      // Start background sync every 10 seconds
      this.syncInterval = setInterval(() => this.processSyncQueue(), 10000);
    }
  }

  async set(key: string, value: any): Promise<void> {
    const item: StorageItem = {
      key,
      value,
      timestamp: Date.now(),
      synced: false
    };

    // Store locally immediately
    this.cache.set(key, item);
    this.saveToLocalStorage();
    console.log(`💾 Stored locally: ${key}`);

    // Queue for cloud sync
    if (isSupabaseConfigured()) {
      this.syncQueue.push(item);
      // Process queue immediately if not syncing
      if (!this.isSyncing) {
        await this.processSyncQueue();
      }
    }
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    return item?.value;
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    this.saveToLocalStorage();
    console.log(`🗑️ Removed: ${key}`);

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('storage').delete().eq('key', key);
      }
    }
  }

  async getAll(): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const [key, item] of this.cache) {
      result[key] = item.value;
    }
    return result;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.saveToLocalStorage();
    console.log('🗑️ Storage cleared');

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('storage').delete().neq('key', '');
      }
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    console.log(`⬆️ Syncing ${this.syncQueue.length} items to cloud...`);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        this.isSyncing = false;
        return;
      }

      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift()!;

        const { error } = await supabase.from('storage').upsert({
          key: item.key,
          value: item.value,
          updated_at: new Date(item.timestamp).toISOString()
        });

        if (!error) {
          item.synced = true;
          console.log(`✅ Synced: ${item.key}`);
        } else {
          console.error(`❌ Sync failed for ${item.key}:`, error);
          // Re-queue for retry
          this.syncQueue.unshift(item);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncFromCloud(): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase.from('storage').select('*');

      if (error) {
        console.error('❌ Cloud sync failed:', error);
        return;
      }

      if (data) {
        data.forEach(item => {
          this.cache.set(item.key, {
            key: item.key,
            value: item.value,
            timestamp: new Date(item.updated_at).getTime(),
            synced: true
          });
        });
        console.log(`✅ Synced ${data.length} items from cloud`);
      }
    } catch (error) {
      console.warn('⚠️ Cloud sync error:', error);
    }
  }

  private saveToLocalStorage(): void {
    const data: Record<string, any> = {};
    for (const [key, item] of this.cache) {
      data[key] = item.value;
    }
    localStorage.setItem('sacred_core_storage', JSON.stringify(data));
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('sacred_core_storage');
      if (data) {
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([key, value]) => {
          this.cache.set(key, {
            key,
            value,
            timestamp: Date.now(),
            synced: false
          });
        });
      }
    } catch (error) {
      console.error('❌ Failed to load localStorage:', error);
    }
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const hybridStorage = new HybridStorageService();
