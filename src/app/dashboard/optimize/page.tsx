'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import OptimizeForm from '@/components/optimize/optimize-form';
import { Product, User } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { LoaderCircle } from 'lucide-react';

export default function OptimizePage() {
  const { user } = useAuth();
  const [salesAgents, setSalesAgents] = useState<User[]>([]);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const usersQuery = query(usersRef, where("role", "==", "sales"));
        const usersSnapshot = await getDocs(usersQuery);
        const agentsList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setSalesAgents(agentsList);

        const productsRef = collection(db, "products");
        const productsQuery = query(productsRef, where("is_active", "==", true));
        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setActiveProducts(productsList);

      } catch (error) {
        console.error("Error fetching optimization data: ", error);
        // Optionally show a toast message
      }
      setLoading(false);
    };

    if (user?.role === 'manager') {
      fetchData();
    }
  }, [user]);

  if (user?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
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
          <h1 className="text-3xl font-bold font-headline tracking-tight">AI Discount Optimizer</h1>
          <p className="text-muted-foreground">Leverage AI to find the perfect discount for any situation.</p>
        </div>
      <OptimizeForm products={activeProducts} salesAgents={salesAgents} />
    </div>
  );
}
