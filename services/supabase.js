// In: services/supabase.js

import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be defined in .env.local");
}

/**
 * A "dummy" storage adapter for the server-side rendering (SSR) context.
 * It has the same interface as localStorage but does nothing, preventing
 * "localStorage is not defined" errors during the Next.js build process.
 */
const ServerStorageAdapter = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * A platform-aware storage adapter.
 * - Uses Capacitor Preferences for native mobile.
 * - Uses localStorage for web browsers.
 * - Is assigned the dummy adapter for server-side execution.
 */
const storageAdapter = {
  getItem: async (key) => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    // Check if running in a browser before using localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key, value) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

/**
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
let supabaseInstance;

/**
 * Returns a singleton instance of the Supabase client, initialized with the
 * correct storage adapter depending on the execution environment.
 */
export function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Use the platform-aware adapter for client-side, and the dummy
        // adapter for server-side.
        storage: typeof window === 'undefined' ? ServerStorageAdapter : storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
}
