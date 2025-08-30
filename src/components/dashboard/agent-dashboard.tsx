'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Ticket, Clock, CheckCircle, Copy, LoaderCircle, AlertTriangle } from 'lucide-react';
import { User, Coupon } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import Countdown from '@/components/coupon/countdown';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function AgentDashboard({ user }: { user: User }) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const allCouponsRef = collection(db, "coupons");
        const allCouponsQuery = query(allCouponsRef, where("user_id", "==", user.id));
        const allCouponsSnapshot = await getDocs(allCouponsQuery);
        
        if (allCouponsSnapshot.empty && (allCouponsSnapshot.metadata.fromCache)) {
             setError("امکان بارگذاری داده‌های داشبورد وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.");
             setLoading(false);
             return;
        }

        const allCouponsList = allCouponsSnapshot.docs.map(doc => doc.data() as Coupon);

        setStats({
          total: allCouponsList.length,
          active: allCouponsList.filter(c => c.status === 'active').length,
          used: allCouponsList.filter(c => c.status === 'used').length
        });

        // Fetch last 5 recent coupons for table
        const recentCouponsQuery = query(
          allCouponsRef, 
          where("user_id", "==", user.id), 
          orderBy("created_at", "desc"),
          limit(5)
        );
        const recentCouponsSnapshot = await getDocs(recentCouponsQuery);
        const recentCouponsList = recentCouponsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
        setCoupons(recentCouponsList);

      } catch (err) {
        console.error("Failed to fetch coupons: ", err);
        if ((err as any).code === 'failed-precondition') {
             setError('یک ایندکس پایگاه داده مورد نیاز است. لطفاً از مدیر سیستم بخواهید ایندکس لازم را در Firestore ایجاد کند.');
        } else {
            setError('امکان دریافت کوپن‌های اخیر وجود نداشت. لطفاً بعداً دوباره تلاش کنید.');
        }
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [user, toast]);

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/coupon/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'در کلیپ‌بورد کپی شد!',
      description: `URL کوپن ${code} برای اشتراک‌گذاری آماده است.`,
    });
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  const statusTranslations: { [key: string]: string } = {
    active: 'فعال',
    used: 'استفاده شده',
    expired: 'منقضی شده'
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-l from-primary to-blue-500 text-primary-foreground shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">آماده برای فروش جدید؟</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            برای نهایی کردن معامله بعدی خود، یک کوپن تخفیف جدید بسازید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
            <Link href="/dashboard/coupons?create=true">
              <PlusCircle className="ml-2 h-5 w-5" />
              ساخت کوپن جدید
            </Link>
          </Button>
        </CardContent>
      </Card>
      
      {error ? (
         <div className="flex flex-col items-center justify-center h-40 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
            <h3 className="font-semibold text-destructive">امکان بارگذاری آمار وجود نداشت</h3>
            <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل کوپن‌های ساخته شده</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">در تمام زمان‌ها</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فعال</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">در حال حاضر</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">استفاده شده</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.used}</div>
            <p className="text-xs text-muted-foreground">تبدیل شده به فروش</p>
          </CardContent>
        </Card>
      </div>
      )}

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">کوپن‌های اخیر شما</CardTitle>
           <CardDescription>نگاهی سریع به ۵ کوپن آخری که ساخته‌اید.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>تخفیف</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>زمان انقضا</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length > 0 ? coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell>{coupon.discount_percent}%</TableCell>
                  <TableCell>
                    <Badge variant={
                      coupon.status === 'active' ? 'default' : coupon.status === 'used' ? 'secondary' : 'destructive'
                    } className={
                       coupon.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 
                       coupon.status === 'used' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' :
                       'bg-red-500/20 text-red-700 border-red-500/30'
                    }>{statusTranslations[coupon.status]}</Badge>
                  </TableCell>
                   <TableCell>
                      {coupon.status === 'active' ? (
                        <Countdown expiryDate={coupon.expires_at} />
                      ) : (
                        '--'
                      )}
                    </TableCell>
                  <TableCell className="text-left">
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(coupon.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {error ? 'امکان بارگذاری کوپن‌های اخیر وجود نداشت.' : 'کوپن جدیدی یافت نشد.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
