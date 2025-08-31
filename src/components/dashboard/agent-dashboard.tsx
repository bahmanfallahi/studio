'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Ticket, Clock, CheckCircle, Copy, LoaderCircle, AlertTriangle } from 'lucide-react';
import { UserProfile, Coupon } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import Countdown from '@/components/coupon/countdown';
import { createClient } from '@/lib/supabase';

export default function AgentDashboard({ userProfile }: { userProfile: UserProfile }) {
  const { toast } = useToast();
  const supabase = createClient();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0 });

  const fetchDashboardData = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch all coupons for stats
      const { data: allCouponsList, error: allCouponsError } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', userProfile.id);

      if (allCouponsError) throw allCouponsError;

      setStats({
        total: allCouponsList.length,
        active: allCouponsList.filter(c => c.status === 'active').length,
        used: allCouponsList.filter(c => c.status === 'used').length
      });

      // Fetch last 5 recent coupons for table
      const { data: recentCouponsList, error: recentCouponsError } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentCouponsError) throw recentCouponsError;

      setCoupons(recentCouponsList);

    } catch (err: any) {
      console.error("Failed to fetch coupons: ", err);
      setError(err.message || 'امکان دریافت کوپن‌های اخیر وجود نداشت. لطفاً بعداً دوباره تلاش کنید.');
    }
    setLoading(false);
  }, [userProfile, supabase]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
                <TableHead className="text-right">کد</TableHead>
                <TableHead className="text-right">تخفیف</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">زمان انقضا</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length > 0 ? coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium text-right">{coupon.code}</TableCell>
                  <TableCell className="text-right">{coupon.discount_percent}%</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={ coupon.status === 'active' ? 'default' : coupon.status === 'used' ? 'secondary' : 'destructive' } 
                          className={ coupon.status === 'active' ? 'bg-green-500/20 text-green-700 border-green-500/30' : coupon.status === 'used' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30' }>
                      {statusTranslations[coupon.status]}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-right">
                      {coupon.status === 'active' ? <Countdown expiryDate={coupon.expires_at} /> : '--'}
                    </TableCell>
                  <TableCell className="text-center">
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
