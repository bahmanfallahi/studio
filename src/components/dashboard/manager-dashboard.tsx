'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle, Users, LoaderCircle, AlertTriangle } from 'lucide-react';
import { Coupon, UserProfile } from '@/lib/data';
import { subMonths, format, startOfMonth, addMonths } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { createClient } from '@/lib/supabase';

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalCoupons: 0,
    usageRate: 0,
    activeCoupons: 0,
    activeAgents: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const couponsPromise = supabase.from("coupons").select('*', { count: 'exact' });
      const agentsPromise = supabase.from("profiles").select('id', { count: 'exact' }).eq('role', 'sales');
      
      const [
        { data: coupons, error: couponsError, count: totalCoupons },
        { error: agentsError, count: activeAgents }
      ] = await Promise.all([couponsPromise, agentsPromise]);

      if (couponsError) throw couponsError;
      if (agentsError) throw agentsError;

      const usedCoupons = coupons.filter(c => c.status === 'used').length;
      const activeCoupons = coupons.filter(c => c.status === 'active' && new Date(c.expires_at) > new Date()).length;
      const usageRate = totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0;

      setStats({ 
        totalCoupons: totalCoupons || 0, 
        usageRate, 
        activeCoupons, 
        activeAgents: activeAgents || 0 
      });

      // Prepare chart data for the last 6 months
      const monthlyData: { [key: string]: { created: number; used: number } } = {};
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

      for (let i = 0; i < 6; i++) {
          const month = format(addMonths(sixMonthsAgo, i), 'MMM', { locale: faIR });
          monthlyData[month] = { created: 0, used: 0 };
      }

      coupons.forEach(coupon => {
          const createdAt = new Date(coupon.created_at);
          if (createdAt >= sixMonthsAgo) {
              const month = format(createdAt, 'MMM', { locale: faIR });
              if (monthlyData[month]) {
                  monthlyData[month].created++;
                  if (coupon.status === 'used') {
                      monthlyData[month].used++;
                  }
              }
          }
      });
      
      const formattedChartData = Object.keys(monthlyData).map(name => ({
          name,
          'ساخته شده': monthlyData[name].created,
          'استفاده شده': monthlyData[name].used
      }));

      setChartData(formattedChartData);

    } catch (err: any) {
      console.error("Error fetching manager dashboard data: ", err);
      setError("امکان بارگذاری داده‌های داشبورد وجود نداشت. لطفاً بعداً دوباره تلاش کنید.");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  if (error) {
     return (
        <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">خطایی رخ داد</h2>
            <p className="text-muted-foreground">{error}</p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل کوپن‌ها</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
            <p className="text-xs text-muted-foreground">در سیستم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نرخ استفاده</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usageRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">از کل کوپن‌ها</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کوپن‌های فعال</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCoupons}</div>
            <p className="text-xs text-muted-foreground">در حال حاضر</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نمایندگان فعال</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">در تیم</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">عملکرد کوپن‌ها</CardTitle>
          <CardDescription>کوپن‌های ساخته شده در مقابل استفاده شده در ۶ ماه گذشته.</CardDescription>
        </CardHeader>
        <CardContent className="pr-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                reversed={true}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                orientation="right"
              />
               <Tooltip
                cursor={{fill: 'hsl(var(--muted))'}}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    direction: 'rtl',
                    fontFamily: 'inherit'
                }}
              />
              <Bar dataKey="ساخته شده" fill="hsl(var(--primary))" name="ساخته شده" radius={[4, 4, 0, 0]} />
              <Bar dataKey="استفاده شده" fill="hsl(var(--accent))" name="استفاده شده" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
