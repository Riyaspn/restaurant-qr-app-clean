// lib/useRequireAuth.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../services/supabase';

export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      if (error) {
        console.error('Error fetching session:', error);
      }
      if (!session) {
        router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      }
      if (isMounted) setChecking(false);
    }

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace('/login');
        }
      }
    );

    // Restore session on mount
    verifySession();

    // Cleanup
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return { checking };
}
