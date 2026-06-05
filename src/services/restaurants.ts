import { supabase } from '../lib/supabase';
import type { RestaurantWithHappyHours } from '../types';

export async function fetchRestaurantsWithHappyHours() {
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `
      *,
      happy_hours (*)
    `
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []) as RestaurantWithHappyHours[];
}
