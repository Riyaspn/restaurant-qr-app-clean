//lib/useRequireAuth.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../services/supabase';

export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      console.log('Verifying Supabase session...');
      const { data, error } = await supabase.auth.getSession();
      console.log('getSession data:', data, 'error:', error);
      const session = data?.session;
      if (error) {
        console.error('Error fetching session:', error);
      }
      if (!session) {
        console.warn('No active session, redirecting to login');
        router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      }
      if (isMounted) {
        setChecking(false);
      }
    }

    console.log('Setting up auth state listener...');
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change event:', event, 'session:', session);
        if (!session) {
          router.replace('/login');
        }
      }
    );

    verifySession();

    return () => {
      isMounted = false;
      if (listener?.subscription) {
        listener.subscription.unsubscribe();
      }
    };
  }, [router]);

  return { checking };
}
