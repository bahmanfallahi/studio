'use server';

import { createClient } from '@/lib/supabase/server';
import { Product } from '@/lib/data';
import { revalidatePath } from 'next/cache';

export async function addProduct(productData: Omit<Product, 'id' | 'created_at'>): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  const { error } = await supabase.from('products').insert([productData]);

  if (error) {
    console.error('Error adding product:', error);
    return { success: false, error };
  }

  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProduct(productId: string, productData: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  const { error } = await supabase.from('products').update(productData).eq('id', productId);

  if (error) {
    console.error('Error updating product:', error);
    return { success: false, error };
  }

  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: any }> {
  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    return { success: false, error };
  }

  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard');
  return { success: true };
}
