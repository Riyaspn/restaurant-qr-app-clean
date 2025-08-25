import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../services/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // If user is already authenticated, send to dashboard
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data && data.session) {
        const dest = (router.query && router.query.redirect) ? String(router.query.redirect) : '/owner';
        router.replace(dest);
      }
    };
    checkSession();

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const dest = (router.query && router.query.redirect) ? String(router.query.redirect) : '/owner';
        router.replace(dest);
      }
    });

    return () => {
      if (sub && sub.subscription) sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setShowForgot(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      const msg = (error.message || '').toLowerCase();

      if (msg.includes('email not confirmed')) {
        setMessage('Please confirm your email first. Check your inbox for the verification link.');
      } else if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setMessage('Incorrect email or password. Please try again.');
        setShowForgot(true);
      } else if (msg.includes('rate limit')) {
        setMessage('Too many attempts. Please wait a minute and try again.');
      } else {
        setMessage('Login error: ' + error.message);
      }
      return;
    }

    const dest = (router.query && router.query.redirect) ? String(router.query.redirect) : '/owner';
    router.push(dest);
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
