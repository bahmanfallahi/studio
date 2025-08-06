'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Ticket, Clock, CheckCircle, Copy, LoaderCircle } from 'lucide-react';
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
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch all coupons for stats
        const allCouponsRef = collection(db, "coupons");
        const allCouponsQuery = query(allCouponsRef, where("user_id", "==", user.id));
        const allCouponsSnapshot = await getDocs(allCouponsQuery);
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

      } catch (error) {
        console.error("Failed to fetch coupons: ", error);
        if ((error as any).code === 'failed-precondition') {
             toast({
              variant: 'destructive',
              title: 'Database Index Required',
              description: 'Please ask the administrator to create the necessary Firestore index to view your coupons.',
              duration: 10000
            });
        } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Could not fetch recent coupons.'
            });
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
      title: 'Copied to clipboard!',
      description: `URL for coupon ${code} is ready to be shared.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Ready for a new sale?</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Generate a new discount coupon to close your next deal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
            <Link href="/dashboard/coupons?create=true">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Coupon
            </Link>
          </Button>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coupons Created</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently live</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.used}</div>
            <p className="text-xs text-muted-foreground">Converted to sales</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Your Recent Coupons</CardTitle>
           <CardDescription>A quick look at the last 5 coupons you created.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    }>{coupon.status}</Badge>
                  </TableCell>
                   <TableCell>
                      {coupon.status === 'active' ? (
                        <Countdown expiryDate={coupon.expires_at} />
                      ) : (
                        '--'
                      )}
                    </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(coupon.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No recent coupons found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
