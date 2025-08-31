'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import OptimizeForm from '@/components/optimize/optimize-form';
import { Product, UserProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase';
import { LoaderCircle } from 'lucide-react';

export default function OptimizePage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [salesAgents, setSalesAgents] = useState<UserProfile[]>([]);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const usersPromise = supabase.from('profiles').select('*').eq('role', 'sales');
      const productsPromise = supabase.from('products').select('*').eq('is_active', true);

      const [
        { data: agentsList, error: usersError },
        { data: productsList, error: productsError }
      ] = await Promise.all([usersPromise, productsPromise]);

      if (usersError) throw usersError;
      if (productsError) throw productsError;

      setSalesAgents(agentsList);
      setActiveProducts(productsList);

    } catch (error) {
      console.error("Error fetching optimization data: ", error);
      // Optionally show a toast message
    }
    setLoading(false);
  }, [supabase]);
  
  useEffect(() => {
    if (profile?.role === 'manager') {
      fetchData();
    }
  }, [profile, fetchData]);

  if (profile?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">دسترسی غیرمجاز</h1>
        <p className="text-muted-foreground">شما اجازه مشاهده این صفحه را ندارید.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div>
       <div className="mb-4">
          <h1 className="text-3xl font-bold font-headline tracking-tight">بهینه‌ساز تخفیف هوشمند</h1>
          <p className="text-muted-foreground">از هوش مصنوعی برای یافتن تخفیف ایده‌آل در هر شرایطی استفاده کنید.</p>
        </div>
      <OptimizeForm products={activeProducts} salesAgents={salesAgents} />
    </div>
  );
}
