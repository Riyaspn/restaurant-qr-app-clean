// In: services/supabase.js

import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

// Read env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This is the new, critical part: A custom storage adapter for Capacitor
const customStorageAdapter = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};

// Initialize the Supabase client with the custom storage adapter
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorageAdapter, // Use the Capacitor-based storage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for Capacitor apps
  },
});
