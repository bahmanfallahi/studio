import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Coupon, Product } from '@/lib/data';
import PublicCouponDisplay from '@/components/coupon/public-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket } from 'lucide-react';
import PublicCouponPageClient from './client-page';

export const dynamic = 'force-dynamic';

async function getCouponData(code: string) {
    const couponsRef = collection(db, "coupons");
    const q = query(couponsRef, where("code", "==", code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

    const productRef = doc(db, "products", coupon.product_id);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
        return null;
    }

    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    
    return { coupon, product };
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
