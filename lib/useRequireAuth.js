//lib/useRequireAuth.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../services/supabase';

export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) {
        const dest = `/login?redirect=${encodeURIComponent(router.asPath || '/owner')}`;
        router.replace(dest);
      }
      setChecking(false);
    };
    run();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checking };
}
