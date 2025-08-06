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

  useEffect(() => {
    const fetchCoupons = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const couponsRef = collection(db, "coupons");
        const q = query(
          couponsRef, 
          where("user_id", "==", user.id), 
          orderBy("created_at", "desc"),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const couponsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
        setCoupons(couponsList);
      } catch (error) {
        console.error("Failed to fetch coupons: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch recent coupons.'
        });
      }
      setLoading(false);
    };
    fetchCoupons();
  }, [user, toast]);

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/coupon/${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied to clipboard!',
      description: `URL for coupon ${code} is ready to be shared.`,
    });
  };
  
  const totalCoupons = coupons.length; // This is only the last 5, might need adjustment for full count
  const activeCoupons = coupons.filter(c => c.status === 'active').length;
  const usedCoupons = coupons.filter(c => c.status === 'used').length;

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
            <CardTitle className="text-sm font-medium">Your Recent Coupons</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoupons}</div>
            <p className="text-xs text-muted-foreground">in the last few days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCoupons}</div>
            <p className="text-xs text-muted-foreground">of recent are live</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usedCoupons}</div>
            <p className="text-xs text-muted-foreground">of recent converted</p>
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
