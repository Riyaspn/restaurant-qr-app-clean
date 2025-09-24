//services/supabase.js

import { createClient } from '@supabase/supabase-js';

// Read env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug: log values in development
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Anon Key:', supabaseAnonKey);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cafeqr-auth-token',
  },
  global: {
    headers: { 'x-from': 'cafeqr-app' }
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});
