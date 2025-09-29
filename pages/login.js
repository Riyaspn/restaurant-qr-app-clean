// In: pages/login.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getSupabase } from '../services/supabase'; // 1. IMPORT

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabase(); // 2. GET the singleton instance
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // *** FIX: REMOVED the problematic useEffect hook that was causing the refresh loop.
  // Auth redirection is now handled by the useRequireAuth hook on protected pages.
  // This page is public and does not need to check the session itself.

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage('');
    setShowForgot(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false);
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('email not confirmed')) {
          setMessage('Please confirm your email first. Check your inbox for the verification link.');
        } else if (msg.includes('invalid login credentials')) {
          setMessage('Incorrect email or password. Please try again.');
          setShowForgot(true);
        } else {
          setMessage('Login error: ' + error.message);
        }
        return;
      }

      // On successful login, Supabase now automatically handles the session.
      // The user will be redirected by the auth guard on the next page they visit.
      const dest = (router.query && router.query.redirect) ? String(router.query.redirect) : '/owner';
      router.push(dest);

    } catch (e) {
      setLoading(false);
      setMessage('An unexpected error occurred during login.');
      console.error('Unhandled login error:', e);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <h1>Restaurant Owner Login</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 16px', marginBottom: 12, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>

      {message && (
        <div
          role="alert"
          style={{
            padding: 12,
            backgroundColor: '#fff3f3',
            border: '1px solid #ffb3b3',
            borderRadius: 6,
            marginBottom: 12
          }}
        >
          {message}
        </div>
      )}

      {showForgot && (
        <div style={{ marginBottom: 12 }}>
          <Link href="/forgot-password" style={{ color: '#0070f3', textDecoration: 'underline' }}>
            Forgot password?
          </Link>
        </div>
      )}

      <p>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Sign up here
        </Link>
      </p>
    </div>
  );
}
