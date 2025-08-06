'use client';
import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle, Users, LoaderCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Coupon, User } from '@/lib/data';
import { subMonths, format, startOfMonth } from 'date-fns';

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCoupons: 0,
    usageRate: 0,
    activeCoupons: 0,
    activeAgents: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const couponsSnapshot = await getDocs(collection(db, "coupons"));
        const coupons = couponsSnapshot.docs.map(doc => doc.data() as Coupon);
        
        const usersSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "sales")));
        const activeAgents = usersSnapshot.size;

        const totalCoupons = coupons.length;
        const usedCoupons = coupons.filter(c => c.status === 'used').length;
        const activeCoupons = coupons.filter(c => c.status === 'active' && new Date(c.expires_at) > new Date()).length;
        const usageRate = totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0;

        setStats({ totalCoupons, usageRate, activeCoupons, activeAgents });

        // Prepare chart data for the last 6 months
        const monthlyData: { [key: string]: { created: number; used: number } } = {};
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

        for (let i = 0; i < 6; i++) {
            const month = format(addMonths(sixMonthsAgo, i), 'MMM');
            monthlyData[month] = { created: 0, used: 0 };
        }

        coupons.forEach(coupon => {
            const createdAt = new Date(coupon.created_at);
            if (createdAt >= sixMonthsAgo) {
                const month = format(createdAt, 'MMM');
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
            ...monthlyData[name]
        }));

        setChartData(formattedChartData);

      } catch (error) {
        console.error("Error fetching manager dashboard data: ", error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
            <p className="text-xs text-muted-foreground">in the system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usageRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">of all coupons</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCoupons}</div>
            <p className="text-xs text-muted-foreground">currently available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">on the team</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Coupon Performance</CardTitle>
          <CardDescription>Coupons created vs. used in the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
               <Tooltip
                cursor={{fill: 'hsl(var(--muted))'}}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                }}
              />
              <Bar dataKey="created" fill="hsl(var(--primary))" name="Created" radius={[4, 4, 0, 0]} />
              <Bar dataKey="used" fill="hsl(var(--accent))" name="Used" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
function addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}
