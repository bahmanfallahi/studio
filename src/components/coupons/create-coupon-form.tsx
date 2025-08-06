'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Product, User, Coupon } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

const couponSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  discount_percent: z.coerce.number().min(1, 'Discount must be at least 1%').max(100, 'Discount cannot exceed 100%'),
  expires_in_days: z.coerce.number().min(1, 'Expiration must be at least 1 day'),
  note: z.string().optional(),
});

type CouponFormData = z.infer<typeof couponSchema>;

interface CreateCouponFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  products: Product[];
  user: User;
  onCouponCreate: (coupon: Omit<Coupon, 'id'|'created_at'|'code'>) => Promise<boolean>;
}

export default function CreateCouponForm({
  isOpen,
  setIsOpen,
  products,
  user,
  onCouponCreate,
}: CreateCouponFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
        expires_in_days: 2,
        discount_percent: 10
    }
  });

  const onSubmit = async (data: CouponFormData) => {
    setIsSubmitting(true);
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + data.expires_in_days);

    const newCouponData: Omit<Coupon, 'id'|'created_at'|'code'> = {
      product_id: parseInt(data.product_id, 10),
      discount_percent: data.discount_percent,
      expires_at: expires_at.toISOString(),
      note: data.note || '',
      user_id: user.id,
      status: 'active',
    };

    const success = await onCouponCreate(newCouponData);
    
    if (success) {
      toast({
        title: 'Coupon Created!',
        description: 'The new coupon has been added to your list.',
      });
      setIsOpen(false);
      reset();
    } else {
       toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create the coupon. Please try again.',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Create New Coupon</DialogTitle>
          <DialogDescription>
            Fill out the details below to generate a new discount coupon.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="product_id" className="text-right">
              Product
            </Label>
            <Controller
              name="product_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.product_id && (
              <p className="col-span-4 text-red-500 text-sm text-right">{errors.product_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="discount_percent" className="text-right">
              Discount (%)
            </Label>
             <Controller
              name="discount_percent"
              control={control}
              render={({ field }) => <Input {...field} id="discount_percent" type="number" className="col-span-3" />}
            />
            {errors.discount_percent && (
              <p className="col-span-4 text-red-500 text-sm text-right">{errors.discount_percent.message}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expires_in_days" className="text-right">
              Expires in (days)
            </Label>
            <Controller
              name="expires_in_days"
              control={control}
              render={({ field }) => <Input {...field} id="expires_in_days" type="number" className="col-span-3" />}
            />
            {errors.expires_in_days && (
              <p className="col-span-4 text-red-500 text-sm text-right">{errors.expires_in_days.message}</p>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note" className="text-right">
              Note
            </Label>
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="note"
                  placeholder="Optional: e.g., For Mr. Smith"
                  className="col-span-3"
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin mr-2"/>}
              {isSubmitting ? 'Creating...' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}