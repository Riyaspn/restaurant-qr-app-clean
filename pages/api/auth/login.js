// pages/api/auth/login.js
import { supabase } from '../../../services/supabase';

export default async function handler(req, res) {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: error.message });
  }
  // On success, you can set a cookie or return session
  res.status(200).json({ user: data.user });
}
