import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const initSupabase = (): SupabaseClient | null => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase not configured. Using offline mode.');
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase initialized successfully');
    return supabaseInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    return null;
  }
};

export const getSupabase = (): SupabaseClient | null => {
  if (!supabaseInstance && import.meta.env.VITE_SUPABASE_URL) {
    return initSupabase();
  }
  return supabaseInstance;
};

export const isSupabaseConfigured = (): boolean => {
  return !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;

    const { error } = await supabase.from('storage').select('key').limit(1);
    
    if (!error) {
      console.log('✅ Supabase connection verified');
      return true;
    } else {
      console.warn('⚠️ Supabase connection check failed:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection check error:', error);
    return false;
  }
};

export const subscribeToChanges = (
  table: string,
  callback: (payload: any) => void
) => {
  const supabase = getSupabase();
  if (!supabase) return null;

  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
};
