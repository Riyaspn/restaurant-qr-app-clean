//pages/api/auth/login.js

import { supabase } from '../../../services/supabase';

export default async function handler(req, res) {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message || JSON.stringify(error) });
    }
    console.log('Login success:', data.user);
    // On success, optionally set cookies or token here
    res.status(200).json({ user: data.user });
  } catch (e) {
    console.error('Unexpected login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
