import { notFound } from 'next/navigation';
import { Coupon, Product } from '@/lib/data';
import PublicCouponPageClient from './client-page';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getCouponData(code: string) {
    // Use admin client for server-side fetching to bypass RLS if necessary,
    // or use anon key if public access is intended and RLS is set up.
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*, products(*)')
        .eq('code', code)
        .single();
        
    if (error || !coupon) {
        console.error('Error fetching coupon:', error?.message);
        return null;
    }

    const productData = coupon.products;
    // The product data is already joined, so we just need to type it.
    // The coupon object contains the rest of the coupon data.
    
    return { coupon: coupon as Coupon, product: productData as Product };
}


export default async function PublicCouponPage({ params }: { params: { code: string } }) {
  const data = await getCouponData(params.code);

  if (!data) {
    notFound();
  }
  
  const { coupon, product } = data;

  return (
    <PublicCouponPageClient coupon={coupon} product={product} />
  );
}
