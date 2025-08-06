import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Coupon, Product } from '@/lib/data';
import PublicCouponDisplay from '@/components/coupon/public-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket } from 'lucide-react';

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
          <Ticket className="h-12 w-12" />
        </div>
        <h1 className="text-5xl font-headline font-bold text-primary">CouponCrafter</h1>
        <p className="text-muted-foreground mt-2">Here is your exclusive offer!</p>
      </div>
      <PublicCouponDisplay coupon={coupon} product={product} />
    </main>
  );
}
