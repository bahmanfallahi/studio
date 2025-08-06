'use client';
import { useAuth } from '@/components/auth-provider';
import OptimizeForm from '@/components/optimize/optimize-form';
import { products, users } from '@/lib/data';

export default function OptimizePage() {
  const { user } = useAuth();
  
  if (user?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const salesAgents = users.filter(u => u.role === 'sales');
  const activeProducts = products.filter(p => p.is_active);

  return (
    <div>
       <div className="mb-4">
          <h1 className="text-3xl font-bold font-headline tracking-tight">AI Discount Optimizer</h1>
          <p className="text-muted-foreground">Leverage AI to find the perfect discount for any situation.</p>
        </div>
      <OptimizeForm products={activeProducts} salesAgents={salesAgents} />
    </div>
  );
}
