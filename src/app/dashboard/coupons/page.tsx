

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, Filter, LoaderCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { User, Coupon, Product } from '@/lib/data';
import CreateCouponForm from '@/components/coupons/create-coupon-form';
import { useToast } from '@/hooks/use-toast';
import Countdown from '@/components/coupon/countdown';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function CouponsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all products
        const productsCollection = collection(db, "products");
        const productsSnapshot = await getDocs(productsCollection);
        const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsList);

        // Fetch all users
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersList);

        // Fetch coupons
        const couponsCollection = collection(db, "coupons");
        const couponsSnapshot = await getDocs(couponsCollection);
        const couponsList = couponsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
        setCoupons(couponsList);

      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({
          variant: 'destructive',
          title: 'Error fetching data',
          description: 'Could not load data from the database.',
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [user, toast]);


  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateOpen(true);
      // Clean up URL
      router.replace('/dashboard/coupons', { scroll: false });
    }
  }, [searchParams, router]);

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/coupon/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied to clipboard!',
      description: `URL for coupon ${code} is ready to be shared.`,
    });
  };

  const filteredCoupons = useMemo(() => {
    let result = user?.role === 'manager' ? coupons : coupons.filter(c => c.user_id === user?.id);

    if (statusFilter.length > 0) {
      result = result.filter(c => statusFilter.includes(c.status));
    }
    if (agentFilter.length > 0 && user?.role === 'manager') {
      result = result.filter(c => agentFilter.includes(c.user_id));
    }
    return result;
  }, [coupons, user, statusFilter, agentFilter]);

  const addCoupon = async (newCouponData: Omit<Coupon, 'id' | 'created_at' | 'code'>) => {
      const productName = products.find(p=>p.id === newCouponData.product_id)?.name?.split(' ')[0].toUpperCase() || 'COUPON';
      const newCoupon: Omit<Coupon, 'id'> = {
        ...newCouponData,
        code: `${productName}-OFF${newCouponData.discount_percent}-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
      };
      
      try {
        const docRef = await addDoc(collection(db, "coupons"), newCoupon);
        setCoupons(prev => [{...newCoupon, id: docRef.id }, ...prev]);
        return true;
      } catch (error) {
        console.error("Error adding coupon: ", error);
        return false;
      }
  };

  const handleDisable = async (couponId: string) => {
    try {
      const couponRef = doc(db, "coupons", couponId);
      await updateDoc(couponRef, { status: "expired" });
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, status: 'expired' } : c));
      toast({ title: "Coupon Disabled", description: "The coupon has been marked as expired." });
    } catch (error) {
      console.error("Error disabling coupon:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not disable the coupon." });
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      toast({ title: "Coupon Deleted", description: "The coupon has been permanently removed." });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the coupon." });
    }
  };

  if (loading || !user) return <div className="flex items-center justify-center h-full"><LoaderCircle className="h-10 w-10 animate-spin" /></div>;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Coupons</h1>
          <p className="text-muted-foreground">
            {user.role === 'manager'
              ? 'Manage and track all coupons.'
              : 'View and manage your created coupons.'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Coupon
        </Button>
      </div>

      <CreateCouponForm
        isOpen={isCreateOpen}
        setIsOpen={setCreateOpen}
        products={products.filter(p => p.is_active)}
        user={user}
        onCouponCreate={addCoupon}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Coupon List</CardTitle>
              <CardDescription>
                A list of all coupons in the system.
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                {['active', 'used', 'expired'].map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={(checked) => {
                      setStatusFilter(prev => checked ? [...prev, status] : prev.filter(s => s !== status))
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
                {user.role === 'manager' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Sales Agent</DropdownMenuLabel>
                    {users.filter(u => u.role === 'sales').map(agent => (
                       <DropdownMenuCheckboxItem
                         key={agent.id}
                         checked={agentFilter.includes(agent.id)}
                         onCheckedChange={(checked) => {
                           setAgentFilter(prev => checked ? [...prev, agent.id] : prev.filter(id => id !== agent.id))
                         }}
                       >
                         {agent.full_name}
                       </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                {user.role === 'manager' && <TableHead>Agent</TableHead>}
                <TableHead>Product</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((coupon) => {
                  const product = products.find((p) => p.id === coupon.product_id);
                  const couponUser = users.find((u) => u.id === coupon.user_id);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium">{coupon.code}</TableCell>
                       {user.role === 'manager' && <TableCell>{couponUser?.full_name || 'N/A'}</TableCell>}
                      <TableCell>{product?.name || 'N/A'}</TableCell>
                      <TableCell>{coupon.discount_percent}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={coupon.status === 'active' ? 'default' : coupon.status === 'used' ? 'secondary' : 'destructive'}
                          className={
                            coupon.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' :
                            coupon.status === 'used' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' :
                            'bg-red-500/20 text-red-700 border-red-500/30'
                          }
                        >
                          {coupon.status}
                        </Badge>
                      </TableCell>
                       <TableCell>
                          {coupon.status === 'active' ? (
                            <Countdown expiryDate={coupon.expires_at} />
                          ) : (
                            new Date(coupon.expires_at).toLocaleDateString()
                          )}
                        </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleCopy(coupon.code)}>
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDisable(coupon.id)}
                                disabled={coupon.status !== 'active'}
                              >
                                Disable
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                               <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the coupon
                                from the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(coupon.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={user.role === 'manager' ? 7 : 6} className="h-24 text-center">
                    No coupons found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
