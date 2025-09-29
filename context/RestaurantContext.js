// In: context/RestaurantContext.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from '../services/supabase'; // 1. IMPORT

const RestaurantCtx = createContext({
  restaurant: null,
  loading: true,
  error: '',
  refresh: async () => {},
});

// 2. REMOVE the supabase prop
export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = getSupabase(); // 3. GET the singleton instance

  async function resolveRestaurant() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setRestaurant(null);
        setLoading(false);
        return;
      }

      const email = user.email || user.user_metadata?.email;
      if (!email) {
        setError('User email not found.');
        setRestaurant(null);
        setLoading(false);
        return;
      }

      const { data: rest, error: rerr } = await supabase
        .from('restaurants')
        .select('id,name,online_paused,owner_email')
        .eq('owner_email', email)
        .maybeSingle();

      if (rerr) throw rerr;
      setRestaurant(rest || null);
    } catch (e) {
      setError(e.message || 'Failed to resolve restaurant');
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (supabase) {
      resolveRestaurant();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        resolveRestaurant();
      });
      return () => subscription?.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return (
    <RestaurantCtx.Provider value={{ restaurant, loading, error, refresh: resolveRestaurant }}>
      {children}
    </RestaurantCtx.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantCtx);
}
