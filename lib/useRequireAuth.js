// In: lib/useRequireAuth.js

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../services/supabase'; // 1. IMPORT

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/privacy-policy'];

// 2. REMOVE the supabase parameter
export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const supabase = getSupabase(); // 3. GET the singleton instance

  useEffect(() => {
    // The supabase client is now guaranteed to be available here,
    // but we still check just in case.
    if (!supabase) {
      setChecking(false);
      return;
    }

    let isMounted = true;

    async function verifySession() {
      if (PUBLIC_PATHS.includes(router.pathname)) {
        if (isMounted) setChecking(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;

      if (error) {
        console.error('Error fetching session:', error);
      }

      if (isMounted) {
        if (!session) {
          router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
        }
        setChecking(false);
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !PUBLIC_PATHS.includes(router.pathname)) {
        router.replace('/login');
      }
    });

    verifySession();

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [supabase, router]); // Keep dependencies

  return { checking };
}
