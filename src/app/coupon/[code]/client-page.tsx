'use client';
import { useState, useEffect } from 'react';
import { Ticket, LoaderCircle } from 'lucide-react';
import PublicCouponDisplay from '@/components/coupon/public-display';
import { Coupon, Product } from '@/lib/data';

export default function PublicCouponPageClient({ coupon, product }: { coupon: Coupon, product: Product}) {
  const [loading, setLoading] = useState(true);

  // This useEffect is to manage the perceived loading state on the client.
  // The data is already fetched by the server component.
  useEffect(() => {
    // Simulate a short delay to prevent flash of loading content
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
          <Ticket className="h-12 w-12" />
        </div>
        <h1 className="text-5xl font-headline font-bold text-primary">CouponCrafter</h1>
        <p className="text-muted-foreground mt-2">Here is your exclusive offer!</p>
      </div>
      {loading ? (
        <div className="w-full max-w-md h-[580px] flex items-center justify-center bg-card rounded-lg shadow-2xl">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <PublicCouponDisplay coupon={coupon} product={product} />
      )}
    </main>
  );
}
