import Razorpay from 'razorpay';
import { supabase } from './supabase';

export async function getRazorpayClient(restaurantId) {
  if (!restaurantId) throw new Error('Missing restaurantId');

  const { data, error } = await supabase
    .from('restaurant_profiles')
    .select('razorpay_key_id, razorpay_key_secret')
    .eq('restaurant_id', restaurantId)
    .single();

  if (error) {
    console.error('Supabase error in getRazorpayClient:', error);
    throw new Error('Failed to fetch razorpay credentials');
  }

  if (!data?.razorpay_key_id || !data?.razorpay_key_secret) {
    throw new Error('Payment gateway not configured for this restaurant');
  }

  return new Razorpay({
    key_id: data.razorpay_key_id,
    key_secret: data.razorpay_key_secret,
  });
}
