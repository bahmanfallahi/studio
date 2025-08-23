'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coupon, Product } from '@/lib/data';
import Image from 'next/image';
import Countdown from './countdown';
import { Badge } from '../ui/badge';
import { Phone } from 'lucide-react';

export default function PublicCouponDisplay({ coupon, product }: { coupon: Coupon; product: Product }) {
  const isExpired = new Date(coupon.expires_at) < new Date();
  const status = coupon.status === 'used' ? 'used' : isExpired ? 'expired' : 'active';
  
  return (
    <Card className="w-full max-w-md shadow-2xl overflow-hidden">
      <CardHeader className="p-0">
        <div className="bg-primary/10 p-6 text-center">
            <p className="font-semibold text-primary">EXCLUSIVE OFFER FOR</p>
            <h2 className="text-2xl font-bold font-headline mt-1">{product.name}</h2>
        </div>
        <div className="relative h-48 w-full">
            <Image 
                src="https://placehold.co/600x400"
                alt={product.name}
                fill={true}
                objectFit="cover"
                data-ai-hint="modem technology"
             />
        </div>
      </CardHeader>
      <CardContent className="p-6 text-center">
        <p className="text-lg text-muted-foreground">Get an amazing discount of</p>
        <div className="my-4">
          <span className="text-8xl font-bold font-headline text-primary">{coupon.discount_percent}</span>
          <span className="text-6xl font-bold font-headline text-primary">%</span>
          <span className="text-4xl font-bold font-headline text-primary ml-2">OFF</span>
        </div>
        <div className="my-6 p-4 bg-muted rounded-lg">
            {status === 'active' && (
                <>
                    <p className="text-sm text-muted-foreground mb-2">This offer expires in:</p>
                    <div className="text-2xl font-bold text-primary">
                        <Countdown expiryDate={coupon.expires_at} />
                    </div>
                </>
            )}
            {status === 'used' && <p className="text-xl font-bold text-primary">This coupon has already been used.</p>}
            {status === 'expired' && <p className="text-xl font-bold text-destructive">This coupon has expired.</p>}
        </div>
        <p className="text-sm text-muted-foreground">Your unique coupon code:</p>
        <p className="text-2xl font-mono tracking-widest my-2 p-2 bg-primary/10 text-primary rounded-md">{coupon.code}</p>
        {status === 'active' && (
            <Button size="lg" className="w-full mt-4">
              <Phone className="mr-2 h-5 w-5"/>
              Contact Sales to Purchase
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
