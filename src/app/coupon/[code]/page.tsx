import { notFound } from 'next/navigation';
import { coupons, products } from '@/lib/data';
import PublicCouponDisplay from '@/components/coupon/public-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket } from 'lucide-react';

export default function PublicCouponPage({ params }: { params: { code: string } }) {
  const coupon = coupons.find((c) => c.code === params.code);

  if (!coupon) {
    notFound();
  }

  const product = products.find((p) => p.id === coupon.product_id);

  if (!product) {
    // Or handle this case gracefully
    notFound();
  }

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
