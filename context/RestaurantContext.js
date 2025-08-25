// context/RestaurantContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const RestaurantCtx = createContext({
  restaurant: null,      // { id, name, logo_url?, online_paused? }
  loading: true,
  error: '',
  refresh: async () => {},
});

export function RestaurantProvider({ children }) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function resolveRestaurant() {
    setLoading(true);
    setError('');
    try {
      // 1) Current session
      const { data: sdata, error: serr } = await supabase.auth.getSession();
      if (serr) throw serr;
      const user = sdata?.session?.user || null;
      if (!user) {
        setRestaurant(null);
        setLoading(false);
        return;
      }

      const email = user.email || user.user_metadata?.email;
      if (!email) {
        setRestaurant(null);
        setLoading(false);
        return;
      }

      // 2) Match on restaurants.owner_email
      const { data: rest, error: rerr } = await supabase
        .from('restaurants')
        .select('id,name,online_paused,owner_email')
        .eq('owner_email', email)
        .maybeSingle();

      if (rerr) throw rerr;

      if (!rest?.id) {
        // No owned restaurant. If you plan staff access, adapt here to join a staff table.
        setRestaurant(null);
      } else {
        setRestaurant(rest);
      }
      setLoading(false);
    } catch (e) {
      setError(e?.message || 'Failed to resolve restaurant');
      setRestaurant(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    resolveRestaurant();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      resolveRestaurant();
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  return (
    <RestaurantCtx.Provider value={{ restaurant, loading, error, refresh: resolveRestaurant }}>
      {children}
    </RestaurantCtx.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantCtx);
}
