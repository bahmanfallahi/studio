'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { UserProfile, Coupon, Product } from '@/lib/data';
import CreateCouponForm from '@/components/coupons/create-coupon-form';
import { useToast } from '@/hooks/use-toast';
import Countdown from '@/components/coupon/countdown';
import { createClient } from '@/lib/supabase';

export default function CouponsPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string[]>([]);
  
  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const productsPromise = supabase.from('products').select('*');
      const usersPromise = profile.role === 'manager' ? supabase.from('profiles').select('*') : Promise.resolve({ data: [profile], error: null });

      let couponsQuery = supabase
        .from('coupons')
        .select('*, products(name), profiles(full_name)')
        .order('created_at', { ascending: false });

      if (profile.role !== 'manager') {
        couponsQuery = couponsQuery.eq('user_id', profile.id);
      }
      
      const [
        { data: productsList, error: productsError },
        { data: usersList, error: usersError },
        { data: couponsList, error: couponsError }
      ] = await Promise.all([productsPromise, usersPromise, couponsQuery]);

      if (productsError) throw productsError;
      if (usersError) throw usersError;
      if (couponsError) throw couponsError;

      setProducts(productsList as Product[]);
      setUsers(usersList as UserProfile[]);
      setCoupons(couponsList as Coupon[]);

    } catch (error: any) {
      console.error("Error fetching data: ", error);
      toast({
        variant: 'destructive',
        title: 'خطا در دریافت اطلاعات',
        description: error.message || 'امکان بارگذاری اطلاعات از پایگاه داده وجود نداشت.',
      });
    }
    setLoading(false);
  }, [profile, supabase, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateOpen(true);
      router.replace('/dashboard/coupons', { scroll: false });
    }
  }, [searchParams, router]);

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/coupon/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'در کلیپ‌بورد کپی شد!',
      description: `URL کوپن ${code} برای اشتراک‌گذاری آماده است.`,
    });
  };

  const filteredCoupons = useMemo(() => {
    let result = coupons;
    if (statusFilter.length > 0) result = result.filter(c => statusFilter.includes(c.status));
    if (agentFilter.length > 0 && profile?.role === 'manager') result = result.filter(c => agentFilter.includes(c.user_id));
    return result;
  }, [coupons, profile, statusFilter, agentFilter]);

  const addCoupon = async (newCouponData: Omit<Coupon, 'id' | 'created_at' | 'code'>) => {
      const productName = products.find(p=>p.id === newCouponData.product_id)?.name?.split(' ').join('').toUpperCase() || 'COUPON';
      const code = `${productName}-OFF${newCouponData.discount_percent}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase
        .from('coupons')
        .insert({ ...newCouponData, code });
      
      if (error) {
        console.error("Error adding coupon: ", error);
        return false;
      }
      fetchData(); // Refetch all data to get the new coupon
      return true;
  };
  
  const handleUpdateStatus = async (couponId: string, status: 'expired' | 'used') => {
    const { error } = await supabase
      .from('coupons')
      .update({ status })
      .eq('id', couponId);

    if (error) {
      console.error(`Error updating coupon to ${status}:`, error);
      toast({ variant: "destructive", title: "بروزرسانی ناموفق", description: `امکان بروزرسانی کوپن وجود نداشت.` });
    } else {
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, status } : c));
      toast({ title: `کوپن ${status === 'used' ? 'استفاده شده' : 'منقضی'} شد`, description: `کوپن به عنوان ${status === 'used' ? 'استفاده شده' : 'منقضی'} علامت‌گذاری شد.` });
    }
  };

  const handleDelete = async (couponId: string) => {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) {
      console.error("Error deleting coupon:", error);
      toast({ variant: "destructive", title: "حذف ناموفق", description: "امکان حذف کوپن وجود نداشت." });
    } else {
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      toast({ title: "کوپن حذف شد", description: "کوپن برای همیشه حذف شد." });
    }
  };

  if (loading || !profile) return <div className="flex items-center justify-center h-full"><LoaderCircle className="h-10 w-10 animate-spin" /></div>;

  const statusTranslations: { [key: string]: string } = { active: 'فعال', used: 'استفاده شده', expired: 'منقضی شده' };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">کوپن‌ها</h1>
          <p className="text-muted-foreground">
            {profile.role === 'manager' ? 'تمام کوپن‌ها را مدیریت و رهگیری کنید.' : 'کوپن‌های ساخته شده خود را مشاهده و مدیریت کنید.'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusCircle className="ml-2 h-4 w-4" /> ساخت کوپن
        </Button>
      </div>

      <CreateCouponForm
        isOpen={isCreateOpen}
        setIsOpen={setCreateOpen}
        products={products.filter(p => p.is_active)}
        userProfile={profile}
        onCouponCreate={addCoupon}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>لیست کوپن‌ها</CardTitle>
              <CardDescription>لیستی از تمام کوپن‌های موجود در سیستم.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">فیلتر</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>فیلتر بر اساس</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>وضعیت</DropdownMenuLabel>
                {['active', 'used', 'expired'].map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={(checked) => setStatusFilter(prev => checked ? [...prev, status] : prev.filter(s => s !== status))}
                  >
                    {statusTranslations[status]}
                  </DropdownMenuCheckboxItem>
                ))}
                {profile.role === 'manager' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>نماینده فروش</DropdownMenuLabel>
                    {users.filter(u => u.role === 'sales').map(agent => (
                       <DropdownMenuCheckboxItem
                         key={agent.id}
                         checked={agentFilter.includes(agent.id)}
                         onCheckedChange={(checked) => setAgentFilter(prev => checked ? [...prev, agent.id] : prev.filter(id => id !== agent.id))}
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
                <TableHead className="text-right">کد</TableHead>
                {profile.role === 'manager' && <TableHead className="text-right">نماینده</TableHead>}
                <TableHead className="text-right">محصول</TableHead>
                <TableHead className="text-right">تخفیف</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">زمان انقضا</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium text-right">{coupon.code}</TableCell>
                       {profile.role === 'manager' && <TableCell className="text-right">{coupon.profiles?.full_name || 'N/A'}</TableCell>}
                      <TableCell className="text-right">{coupon.products?.name || 'N/A'}</TableCell>
                      <TableCell className="text-right">{coupon.discount_percent}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={coupon.status === 'active' ? 'default' : coupon.status === 'used' ? 'secondary' : 'destructive'}
                          className={ coupon.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : coupon.status === 'used' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30' }>
                          {statusTranslations[coupon.status]}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-right">
                          {coupon.status === 'active' ? <Countdown expiryDate={coupon.expires_at} /> : new Date(coupon.expires_at).toLocaleDateString('fa-IR')}
                        </TableCell>
                      <TableCell className="text-center">
                        <AlertDialog>
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><span className="sr-only">باز کردن منو</span><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleCopy(coupon.code)}>کپی لینک</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(coupon.id, 'used')} disabled={coupon.status !== 'active'}>علامت‌گذاری به عنوان استفاده شده</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(coupon.id, 'expired')} disabled={coupon.status !== 'active'}>غیرفعال کردن</DropdownMenuItem>
                              <DropdownMenuSeparator />
                               <AlertDialogTrigger asChild><DropdownMenuItem className="text-red-600">حذف</DropdownMenuItem></AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>آیا کاملاً مطمئن هستید؟</AlertDialogTitle>
                              <AlertDialogDescription>این عملیات قابل بازگشت نیست. این کار کوپن را برای همیشه از پایگاه داده حذف می‌کند.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>انصراف</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(coupon.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={profile.role === 'manager' ? 7 : 6} className="h-24 text-center">کوپنی یافت نشد.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
