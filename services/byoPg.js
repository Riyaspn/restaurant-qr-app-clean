import Razorpay from 'razorpay';
import { supabase } from './supabase';

export async function getRazorpayClient(restaurantId) {
  const { data, error } = await supabase
    .from('restaurant_profiles')
    .select('razorpay_key_id, razorpay_key_secret')
    .eq('restaurant_id', restaurantId)
    .single();

  if (error || !data?.razorpay_key_id || !data?.razorpay_key_secret) {
    throw new Error('Payment gateway not configured for this restaurant');
  }

  return new Razorpay({
    key_id: data.razorpay_key_id,
    key_secret: data.razorpay_key_secret,
  });
}
