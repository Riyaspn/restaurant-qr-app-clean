// lib/authActions.js
import { supabase } from '../services/supabase';

export async function signOutAndRedirect(pushOrReplace) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  // prefer replace to avoid back button returning to protected page
  pushOrReplace('/login');
}
