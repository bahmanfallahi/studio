'use server';

import { createClient } from '@/lib/supabase/server';
import { Coupon } from '@/lib/data';
import { revalidatePath } from 'next/cache';

export async function addCoupon(couponData: Omit<Coupon, 'id' | 'created_at' | 'code'>, code: string): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  
  const dataToInsert = {
    ...couponData,
    code,
    note: couponData.note || '', // Ensure note is not null/undefined
  };

  const { error } = await supabase.from('coupons').insert(dataToInsert);

  if (error) {
    console.error('Error adding coupon:', error);
    return { success: false, error };
  }

  revalidatePath('/dashboard/coupons');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateCouponStatus(couponId: string, status: 'expired' | 'used'): Promise<{ success: boolean; error?: any }> {
    const supabase = createClient();
    const { error } = await supabase.from('coupons').update({ status }).eq('id', couponId);

    if (error) {
        console.error('Error updating coupon status:', error);
        return { success: false, error };
    }
    revalidatePath('/dashboard/coupons');
    return { success: true };
}


export async function deleteCoupon(couponId: string): Promise<{ success: boolean; error?: any }> {
    const supabase = createClient();
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);

    if (error) {
        console.error('Error deleting coupon:', error);
        return { success: false, error };
    }
    revalidatePath('/dashboard/coupons');
    return { success: true };
}
