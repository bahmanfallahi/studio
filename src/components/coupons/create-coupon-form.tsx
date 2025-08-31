'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Product, UserProfile, Coupon } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { startOfMonth } from 'date-fns';

const couponSchema = z.object({
  product_id: z.string().min(1, 'انتخاب محصول الزامی است'),
  discount_percent: z.coerce.number().min(1, 'تخفیف باید حداقل ۱٪ باشد').max(100, 'تخفیف نمی‌تواند بیش از ۱۰۰٪ باشد'),
  expires_in_days: z.coerce.number().min(1, 'انقضا باید حداقل ۱ روز باشد'),
  note: z.string().optional(),
});

type CouponFormData = z.infer<typeof couponSchema>;

interface CreateCouponFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  products: Product[];
  userProfile: UserProfile;
  onCouponCreate: (coupon: Omit<Coupon, 'id'|'created_at'|'code'>) => Promise<boolean>;
}

export default function CreateCouponForm({
  isOpen,
  setIsOpen,
  products,
  userProfile,
  onCouponCreate,
}: CreateCouponFormProps) {
  const { toast } = useToast();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canCreate, setCanCreate] = useState(true);
  const [couponsThisMonth, setCouponsThisMonth] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: { expires_in_days: 2, discount_percent: 10 }
  });
  
  const checkCouponLimit = useCallback(async () => {
    if (userProfile.role !== 'sales' || !isOpen) return;

    const startOfMonthDate = startOfMonth(new Date());
    
    const { count, error } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .gte('created_at', startOfMonthDate.toISOString());

    if (error) {
      console.error("Error checking coupon limit:", error);
      setCanCreate(true); // Default to allowing creation if there's an error
      return;
    }

    const currentCount = count || 0;
    setCouponsThisMonth(currentCount);
    setCanCreate(currentCount < userProfile.coupon_limit_per_month);
  }, [userProfile, isOpen, supabase]);


  useEffect(() => {
    if (isOpen) {
        checkCouponLimit();
    }
  }, [isOpen, checkCouponLimit]);


  const onSubmit = async (data: CouponFormData) => {
    await checkCouponLimit(); // Re-check just before submission

    if (!canCreate && userProfile.role !== 'manager') {
       toast({
        variant: 'destructive',
        title: 'محدودیت ساخت کوپن',
        description: `شما به سقف ماهانه ${userProfile.coupon_limit_per_month} کوپن خود رسیده‌اید.`,
      });
      return;
    }

    setIsSubmitting(true);
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + data.expires_in_days);

    const newCouponData: Omit<Coupon, 'id'|'created_at'|'code'> = {
      product_id: data.product_id,
      discount_percent: data.discount_percent,
      expires_at: expires_at.toISOString(),
      note: data.note || '',
      user_id: userProfile.id,
      status: 'active',
    };

    const success = await onCouponCreate(newCouponData);
    
    if (success) {
      toast({ title: 'کوپن ساخته شد!', description: 'کوپن جدید به لیست شما اضافه شد.' });
      setIsOpen(false);
      reset();
    } else {
       toast({ variant: 'destructive', title: 'ساخت ناموفق', description: 'امکان ساخت کوپن وجود نداشت. لطفاً دوباره تلاش کنید.' });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">ساخت کوپن جدید</DialogTitle>
          <DialogDescription>برای تولید کوپن تخفیف جدید، جزئیات زیر را پر کنید.</DialogDescription>
           {userProfile.role === 'sales' && (
            <div className="pt-2 text-sm text-muted-foreground">
              سقف ماهانه شما: {couponsThisMonth} / {userProfile.coupon_limit_per_month} کوپن ساخته شده.
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="product_id" className="text-right">محصول</Label>
            <Controller name="product_id" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                <SelectTrigger className="col-span-3"><SelectValue placeholder="یک محصول را انتخاب کنید" /></SelectTrigger>
                <SelectContent>{products.map((product) => (<SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>))}</SelectContent>
              </Select>
            )} />
            {errors.product_id && <p className="col-span-4 text-red-500 text-sm text-left">{errors.product_id.message}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="discount_percent" className="text-right">تخفیف (%)</Label>
             <Controller name="discount_percent" control={control} render={({ field }) => <Input {...field} id="discount_percent" type="number" className="col-span-3" />} />
            {errors.discount_percent && <p className="col-span-4 text-red-500 text-sm text-left">{errors.discount_percent.message}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expires_in_days" className="text-right">انقضا (روز)</Label>
            <Controller name="expires_in_days" control={control} render={({ field }) => <Input {...field} id="expires_in_days" type="number" className="col-span-3" />} />
            {errors.expires_in_days && <p className="col-span-4 text-red-500 text-sm text-left">{errors.expires_in_days.message}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note" className="text-right">یادداشت</Label>
            <Controller name="note" control={control} render={({ field }) => (
              <Textarea {...field} id="note" placeholder="اختیاری: مثلاً برای آقای رضایی" className="col-span-3" />
            )} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !canCreate}>
              {isSubmitting && <LoaderCircle className="animate-spin ml-2"/>}
              {isSubmitting ? 'در حال ساخت...' : 'ساخت کوپن'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
