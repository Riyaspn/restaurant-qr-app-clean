// hooks/useGlobalKot.js

import { useEffect } from 'react';
import { useKot } from '../context/KotContext';
import { getSupabase } from '../services/supabase';
import { useRestaurant } from '../context/RestaurantContext';

export const useGlobalKot = () => {
  const { addKotToQueue } = useKot();
  const { restaurant } = useRestaurant();
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase || !restaurant?.id) return;

    const channel = supabase
      .channel(`global_orders:${restaurant.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders', 
          filter: `restaurant_id=eq.${restaurant.id}` 
        },
        async (payload) => {
          const order = payload.new;
          if (!order || order.status !== 'new') return;

          console.log('Global KOT: New order received:', order);

          try {
            // Fetch complete order with items
            const { data: fullOrder, error } = await supabase
              .from('orders')
              .select(`
                *,
                order_items(
                  *,
                  menu_items(name)
                )
              `)
              .eq('id', order.id)
              .single();

            if (error) {
              console.error('Error fetching full order for global KOT:', error);
              return;
            }

            console.log('Global KOT: Full order fetched:', fullOrder);
            addKotToQueue(fullOrder);

          } catch (err) {
            console.error('Exception in global KOT fetch:', err);
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, [supabase, restaurant?.id, addKotToQueue]);
};
