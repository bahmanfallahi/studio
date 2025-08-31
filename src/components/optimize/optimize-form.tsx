'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { optimizeDiscount, OptimizeDiscountInput, OptimizeDiscountOutput } from '@/ai/flows/discount-optimization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Product, UserProfile } from '@/lib/data';
import { Sparkles, LoaderCircle, Lightbulb } from 'lucide-react';

const optimizeSchema = z.object({
  productId: z.string().min(1, 'انتخاب محصول الزامی است'),
  salesAgentId: z.string().min(1, 'انتخاب نماینده فروش الزامی است'),
  salesAgentPerformance: z.coerce.number().min(0, 'عملکرد باید یک عدد مثبت باشد'),
  marketConditions: z.string().min(10, 'شرایط بازار باید حداقل ۱۰ کاراکتر باشد'),
});

type OptimizeFormData = z.infer<typeof optimizeSchema>;

interface OptimizeFormProps {
  products: Product[];
  salesAgents: UserProfile[];
}

export default function OptimizeForm({ products, salesAgents }: OptimizeFormProps) {
  const [result, setResult] = useState<OptimizeDiscountOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OptimizeFormData>({
    resolver: zodResolver(optimizeSchema),
  });

  const onSubmit = async (data: OptimizeFormData) => {
    setResult(null);
    setError(null);
    try {
      const input: OptimizeDiscountInput = {
        ...data,
      };
      const response = await optimizeDiscount(input);
      setResult(response);
    } catch (e) {
      setError('دریافت پیشنهاد بهینه‌سازی با شکست مواجه شد. لطفاً دوباره تلاش کنید.');
      console.error(e);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>ورودی‌های بهینه‌سازی</CardTitle>
          <CardDescription>برای دریافت پیشنهاد تخفیف، جزئیات زیر را ارائه دهید.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="productId">محصول</Label>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="یک محصول را انتخاب کنید" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.productId && <p className="text-red-500 text-sm mt-1">{errors.productId.message}</p>}
            </div>

            <div>
              <Label htmlFor="salesAgentId">نماینده فروش</Label>
              <Controller
                name="salesAgentId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="یک نماینده را انتخاب کنید" /></SelectTrigger>
                    <SelectContent>{salesAgents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.salesAgentId && <p className="text-red-500 text-sm mt-1">{errors.salesAgentId.message}</p>}
            </div>

            <div>
              <Label htmlFor="salesAgentPerformance">عملکرد نماینده (فروش ماه گذشته)</Label>
              <Controller
                name="salesAgentPerformance"
                control={control}
                render={({ field }) => <Input {...field} type="number" placeholder="مثلاً: ۲۵" />}
              />
              {errors.salesAgentPerformance && <p className="text-red-500 text-sm mt-1">{errors.salesAgentPerformance.message}</p>}
            </div>

            <div>
              <Label htmlFor="marketConditions">شرایط بازار</Label>
              <Controller
                name="marketConditions"
                control={control}
                render={({ field }) => <Textarea {...field} placeholder="مثلاً: رقابت بالا، رقیب ۱۵٪ تخفیف ارائه می‌دهد." />}
              />
              {errors.marketConditions && <p className="text-red-500 text-sm mt-1">{errors.marketConditions.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <LoaderCircle className="animate-spin ml-2" /> : <Sparkles className="ml-2 h-4 w-4" />}
              {isSubmitting ? 'در حال بهینه‌سازی...' : 'دریافت پیشنهاد'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center">
        {isSubmitting && (
           <Card className="w-full h-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">هوش مصنوعی در حال تحلیل داده‌هاست...</p>
          </Card>
        )}
        {!isSubmitting && result && (
          <Card className="w-full bg-gradient-to-br from-primary/10 to-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb className="text-accent" /> پیشنهاد هوش مصنوعی</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">تخفیف بهینه</p>
              <p className="text-7xl font-bold font-headline text-primary my-4">{result.discountPercentage}%</p>
              <div className="text-left p-4 bg-background/50 rounded-lg">
                <p className="font-semibold mb-2">منطق پیشنهاد:</p>
                <p className="text-sm text-muted-foreground text-right">{result.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        )}
         {!isSubmitting && !result && (
          <Card className="w-full h-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">پیشنهاد شما در اینجا نمایش داده می‌شود.</p>
          </Card>
        )}
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
