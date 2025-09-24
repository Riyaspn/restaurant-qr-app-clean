// src/lib/session.ts
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../services/supabase';

const STORAGE_KEY = 'cafeqr-supabase-session';

// Save the Supabase session object to Capacitor Preferences
export async function saveSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(session),
      });
      console.log('Session saved to Capacitor Preferences');
    }
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

// Restore session on app startup
export async function restoreSession(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      const session = JSON.parse(value);
      
      // Check if session is still valid (not expired)
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      
      if (expiresAt > now) {
        await supabase.auth.setSession(session);
        console.log('Supabase session restored from preferences');
      } else {
        console.log('Stored session expired, clearing...');
        await Preferences.remove({ key: STORAGE_KEY });
      }
    } else {
      console.log('No stored session found');
    }
  } catch (error) {
    console.error('Failed to restore session:', error);
    // Clear potentially corrupted session data
    await Preferences.remove({ key: STORAGE_KEY });
  }
}

// Clear session on logout
export async function clearSession(): Promise<void> {
  try {
    await Preferences.remove({ key: STORAGE_KEY });
    console.log('Session cleared from preferences');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}
